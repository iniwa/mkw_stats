"""Play-session and race-record lifecycle.

Ranked races are drafted on course selection and finished later via
complete-ranked. Lounge races are completed immediately on selection, the
session auto-finishes after race 12, and repick warnings never block a record.
"""
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AppSettings,
    Course,
    PlaySession,
    RaceRecord,
    RatingSnapshot,
    Route,
    VrAccount,
)
from app.models.enums import RaceStatus, SessionStatus, SourceType
from app.schemas import (
    PlaySessionCreate,
    RaceCompleteRankedRequest,
    RaceDraftRequest,
    RaceUpdateRequest,
)
from app.services.warnings import compute_lounge_warnings

LOUNGE_MATCH_RACES = 12


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------
def _resolve_ranked_account(db: Session, provided: uuid.UUID | None) -> VrAccount:
    if provided is not None:
        account = db.get(VrAccount, provided)
        if account is None:
            raise HTTPException(404, f"vr account not found: {provided}")
        return account

    settings = db.get(AppSettings, 1)
    if settings is not None and settings.selected_vr_account_id is not None:
        account = db.get(VrAccount, settings.selected_vr_account_id)
        if account is not None:
            return account

    account = db.scalars(
        select(VrAccount).where(VrAccount.is_active.is_(True))
    ).first()
    if account is None:
        raise HTTPException(
            400, "ranked session needs a VR account: none provided, selected, or active"
        )
    return account


def create_session(db: Session, payload: PlaySessionCreate) -> PlaySession:
    session = PlaySession(
        source=payload.source,
        status=SessionStatus.active,
        title=payload.title,
        player_count=payload.player_count,
        format=payload.format,
    )
    if payload.source == SourceType.ranked:
        session.vr_account_id = _resolve_ranked_account(db, payload.vr_account_id).id
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: uuid.UUID) -> PlaySession:
    session = db.get(PlaySession, session_id)
    if session is None:
        raise HTTPException(404, f"play session not found: {session_id}")
    return session


def list_active_sessions(db: Session) -> list[PlaySession]:
    return list(
        db.scalars(
            select(PlaySession)
            .where(PlaySession.status == SessionStatus.active)
            .order_by(PlaySession.started_at)
        )
    )


def finish_session(db: Session, session_id: uuid.UUID) -> PlaySession:
    session = get_session(db, session_id)
    if session.status != SessionStatus.active:
        raise HTTPException(400, f"session is not active (status={session.status.value})")
    session.status = SessionStatus.completed
    session.completed_at = _now()
    db.commit()
    db.refresh(session)
    return session


# --------------------------------------------------------------------------
# Races
# --------------------------------------------------------------------------
def _next_race_no(db: Session, session_id: uuid.UUID) -> int:
    count = db.scalar(
        select(func.count())
        .select_from(RaceRecord)
        .where(
            RaceRecord.session_id == session_id,
            RaceRecord.status != RaceStatus.cancelled,
        )
    )
    return (count or 0) + 1


def _validate_target(db: Session, course_id: str | None, route_id: str | None) -> None:
    if course_id is not None and db.get(Course, course_id) is None:
        raise HTTPException(404, f"course not found: {course_id}")
    if route_id is not None and db.get(Route, route_id) is None:
        raise HTTPException(404, f"route not found: {route_id}")


def draft_race(
    db: Session, session_id: uuid.UUID, payload: RaceDraftRequest
) -> tuple[RaceRecord, list[str]]:
    session = get_session(db, session_id)
    if session.status != SessionStatus.active:
        raise HTTPException(400, f"session is not active (status={session.status.value})")

    _validate_target(db, payload.course_id, payload.route_id)

    warnings: list[str] = []
    if session.source == SourceType.lounge:
        warnings = compute_lounge_warnings(db, session, payload.course_id, payload.route_id)

    race = RaceRecord(
        session_id=session.id,
        source=session.source,
        race_no=_next_race_no(db, session.id),
        course_id=payload.course_id,
        route_id=payload.route_id,
        player_count=payload.player_count or session.player_count,
        warning_flags=warnings or None,
    )
    if session.source == SourceType.ranked:
        race.status = RaceStatus.draft
        race.vr_account_id = session.vr_account_id
    else:
        # Lounge records are complete on selection.
        race.status = RaceStatus.completed

    db.add(race)
    db.flush()

    # Lounge match auto-finishes once 12 races are recorded.
    if session.source == SourceType.lounge and race.race_no >= LOUNGE_MATCH_RACES:
        session.status = SessionStatus.completed
        session.completed_at = _now()

    db.commit()
    db.refresh(race)
    return race, warnings


def complete_ranked(
    db: Session, race_id: uuid.UUID, payload: RaceCompleteRankedRequest
) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    if race.source != SourceType.ranked:
        raise HTTPException(400, "complete-ranked is only valid for ranked races")
    if race.status != RaceStatus.draft:
        raise HTTPException(400, f"race is not a draft (status={race.status.value})")
    if race.vr_account_id is None:
        raise HTTPException(400, "ranked race has no VR account")

    account = db.get(VrAccount, race.vr_account_id)
    if account is None:
        raise HTTPException(404, f"vr account not found: {race.vr_account_id}")

    rating_before = payload.rating_before if payload.rating_before is not None else account.current_vr
    rating_after = (
        payload.rating_after
        if payload.rating_after is not None
        else rating_before + payload.rating_delta
    )

    race.player_count = payload.player_count
    race.placement_band = payload.placement_band
    race.rating_delta = payload.rating_delta
    race.rating_before = rating_before
    race.rating_after = rating_after
    race.character_id = payload.character_id
    race.vehicle_id = payload.vehicle_id
    if payload.memo is not None:
        race.memo = payload.memo
    race.status = RaceStatus.completed

    account.current_vr = rating_after

    db.add(
        RatingSnapshot(
            source=SourceType.ranked,
            vr_account_id=account.id,
            value=rating_after,
            delta=payload.rating_delta,
            captured_at=_now(),
            race_record_id=race.id,
        )
    )
    db.commit()
    db.refresh(race)
    return race


def update_race(db: Session, race_id: uuid.UUID, payload: RaceUpdateRequest) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(race, field, value)
    db.commit()
    db.refresh(race)
    return race


def _revert_race_effects(db: Session, race: RaceRecord) -> None:
    """Undo the VR change and rating snapshot of a completed ranked race.

    Only reverts current_vr when this race was the last VR change, so cancelling
    a mid-history race does not silently rewind unrelated later races.
    """
    snapshots = list(
        db.scalars(select(RatingSnapshot).where(RatingSnapshot.race_record_id == race.id))
    )
    for snap in snapshots:
        db.delete(snap)

    if race.source == SourceType.ranked and race.rating_after is not None and race.vr_account_id:
        account = db.get(VrAccount, race.vr_account_id)
        if account is not None and account.current_vr == race.rating_after:
            account.current_vr = race.rating_before if race.rating_before is not None else account.current_vr


def cancel_race(db: Session, race_id: uuid.UUID) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    if race.status == RaceStatus.cancelled:
        return race
    if race.status == RaceStatus.completed:
        _revert_race_effects(db, race)
    race.status = RaceStatus.cancelled
    db.commit()
    db.refresh(race)
    return race


def undo_last_race(db: Session, session_id: uuid.UUID) -> RaceRecord:
    session = get_session(db, session_id)
    race = db.scalars(
        select(RaceRecord)
        .where(
            RaceRecord.session_id == session_id,
            RaceRecord.status != RaceStatus.cancelled,
        )
        .order_by(RaceRecord.race_no.desc())
    ).first()
    if race is None:
        raise HTTPException(404, "no race to undo in this session")

    if race.status == RaceStatus.completed:
        _revert_race_effects(db, race)
    race.status = RaceStatus.cancelled

    # Reopen a session that auto-finished, so the undone race can be redone.
    if session.status == SessionStatus.completed:
        session.status = SessionStatus.active
        session.completed_at = None

    db.commit()
    db.refresh(race)
    return race
