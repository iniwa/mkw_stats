"""Play-session and race-record lifecycle."""
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
    RaceCompleteLoungeRequest,
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


def list_sessions(
    db: Session,
    limit: int = 50,
    status: SessionStatus | None = None,
    source: SourceType | None = None,
    started_from: datetime | None = None,
    started_to: datetime | None = None,
) -> list[PlaySession]:
    stmt = select(PlaySession).order_by(PlaySession.started_at.desc())
    if status is not None:
        stmt = stmt.where(PlaySession.status == status)
    if source is not None:
        stmt = stmt.where(PlaySession.source == source)
    if started_from is not None:
        stmt = stmt.where(PlaySession.started_at >= started_from)
    if started_to is not None:
        stmt = stmt.where(PlaySession.started_at < started_to)
    stmt = stmt.limit(limit)
    return list(db.scalars(stmt))


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
    session.completion_reason = "manual"
    db.commit()
    db.refresh(session)
    return session


def list_session_races(
    db: Session, session_id: uuid.UUID, include_cancelled: bool = False, include_hidden: bool = False
) -> list[RaceRecord]:
    get_session(db, session_id)  # 404 if the session does not exist
    stmt = select(RaceRecord).where(RaceRecord.session_id == session_id)
    if not include_cancelled:
        stmt = stmt.where(RaceRecord.status != RaceStatus.cancelled)
    if not include_hidden:
        stmt = stmt.where(RaceRecord.is_hidden.is_(False))
    stmt = stmt.order_by(RaceRecord.race_no, RaceRecord.created_at)
    return list(db.scalars(stmt))


def delete_session(db: Session, session_id: uuid.UUID) -> None:
    session = get_session(db, session_id)

    all_races = list(db.scalars(
        select(RaceRecord).where(RaceRecord.session_id == session_id)
    ))

    # Revert ranked completed races newest-first so current_vr rewinds safely
    for race in sorted(
        (r for r in all_races if r.source == SourceType.ranked and r.status == RaceStatus.completed),
        key=lambda r: (r.race_no or 0, r.created_at),
        reverse=True,
    ):
        _revert_race_effects(db, race)

    # Clean up snapshots on draft, cancelled, and lounge races
    for race in all_races:
        if not (race.source == SourceType.ranked and race.status == RaceStatus.completed):
            _revert_race_effects(db, race)

    # Flush deletes in FK-safe order: snapshots -> races -> session.
    # The models define no ORM relationships, so SQLAlchemy's unit of work does
    # not know to order these DELETEs; without explicit flushes it can emit the
    # parent (play_sessions) DELETE before its child race_records rows, which
    # fails the foreign-key constraint on PostgreSQL.
    db.flush()
    for race in all_races:
        db.delete(race)
    db.flush()
    db.delete(session)
    db.commit()


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
        status=RaceStatus.draft,
    )
    if session.source == SourceType.ranked:
        race.vr_account_id = session.vr_account_id

    db.add(race)
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
    if payload.placement > payload.player_count:
        raise HTTPException(400, f"placement {payload.placement} exceeds player_count {payload.player_count}")

    account = db.get(VrAccount, race.vr_account_id)
    if account is None:
        raise HTTPException(404, f"vr account not found: {race.vr_account_id}")

    rating_before = payload.rating_before if payload.rating_before is not None else account.current_vr
    rating_after = payload.rating_after
    rating_delta = rating_after - rating_before

    race.player_count = payload.player_count
    race.placement = payload.placement
    race.rating_before = rating_before
    race.rating_after = rating_after
    race.rating_delta = rating_delta
    race.character_id = payload.character_id
    race.vehicle_id = payload.vehicle_id
    race.status = RaceStatus.completed

    account.current_vr = rating_after

    db.add(
        RatingSnapshot(
            source=SourceType.ranked,
            vr_account_id=account.id,
            value=rating_after,
            delta=rating_delta,
            captured_at=_now(),
            race_record_id=race.id,
        )
    )
    db.commit()
    db.refresh(race)
    return race


def complete_lounge(
    db: Session, race_id: uuid.UUID, payload: RaceCompleteLoungeRequest
) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    if race.source != SourceType.lounge:
        raise HTTPException(400, "complete-lounge is only valid for lounge races")
    if race.status != RaceStatus.draft:
        raise HTTPException(400, f"race is not a draft (status={race.status.value})")

    session = db.get(PlaySession, race.session_id)
    if session and session.player_count and payload.placement > session.player_count:
        raise HTTPException(400, f"placement {payload.placement} exceeds player_count {session.player_count}")

    race.placement = payload.placement
    race.score = payload.score
    race.status = RaceStatus.completed

    db.flush()

    if session:
        _sync_lounge_auto_finish(db, session)

    db.commit()
    db.refresh(race)
    return race


def update_race(db: Session, race_id: uuid.UUID, payload: RaceUpdateRequest) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    updates = payload.model_dump(exclude_unset=True)
    if 'rating_after' in updates:
        ra = updates.pop('rating_after')
        race.rating_after = ra
        if ra is not None and race.rating_before is not None:
            race.rating_delta = ra - race.rating_before
    for field, value in updates.items():
        setattr(race, field, value)
    db.commit()
    db.refresh(race)
    return race


def hide_race(db: Session, race_id: uuid.UUID) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    race.is_hidden = True
    race.hidden_at = _now()
    db.flush()
    session = db.get(PlaySession, race.session_id)
    if session:
        _sync_lounge_auto_finish(db, session)
    db.commit()
    db.refresh(race)
    return race


def restore_race(db: Session, race_id: uuid.UUID) -> RaceRecord:
    race = db.get(RaceRecord, race_id)
    if race is None:
        raise HTTPException(404, f"race record not found: {race_id}")
    if not race.is_hidden:
        return race
    race.is_hidden = False
    race.hidden_at = None
    db.flush()
    session = db.get(PlaySession, race.session_id)
    if session:
        _sync_lounge_auto_finish(db, session)
    db.commit()
    db.refresh(race)
    return race


def _sync_lounge_auto_finish(db: Session, session: PlaySession) -> None:
    if session.source != SourceType.lounge:
        return

    completed_count = db.scalar(
        select(func.count())
        .select_from(RaceRecord)
        .where(
            RaceRecord.session_id == session.id,
            RaceRecord.status == RaceStatus.completed,
            RaceRecord.is_hidden.is_(False),
        )
    ) or 0

    if completed_count >= LOUNGE_MATCH_RACES and session.status == SessionStatus.active:
        session.status = SessionStatus.completed
        session.completed_at = _now()
        session.completion_reason = "auto"
    elif (
        completed_count < LOUNGE_MATCH_RACES
        and session.status == SessionStatus.completed
        and session.completion_reason == "auto"
    ):
        session.status = SessionStatus.active
        session.completed_at = None
        session.completion_reason = None


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
