"""Lounge course-history warning logic.

Warnings are advisory: callers must record the race regardless of what this
returns. See mkworld_stats_manager_docs_v0_1/04_db_design.md section 4.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PlaySession, RaceRecord, Route
from app.models.enums import RaceStatus

WARN_REPICK = "repick"
WARN_ROUTE_BANNED_12P = "route_banned_12p"


def compute_lounge_warnings(
    db: Session,
    session: PlaySession,
    course_id: str | None,
    route_id: str | None,
) -> list[str]:
    """Return advisory warning flags for a Lounge course/route selection."""
    warnings: list[str] = []

    completed = list(
        db.scalars(
            select(RaceRecord).where(
                RaceRecord.session_id == session.id,
                RaceRecord.status == RaceStatus.completed,
            )
        )
    )

    if course_id is not None and any(r.course_id == course_id for r in completed):
        warnings.append(WARN_REPICK)

    if route_id is not None:
        route = db.get(Route, route_id)
        if route is not None:
            if route.repick_group_key is not None:
                for r in completed:
                    if r.route_id is None:
                        continue
                    other = db.get(Route, r.route_id)
                    if other is not None and other.repick_group_key == route.repick_group_key:
                        if WARN_REPICK not in warnings:
                            warnings.append(WARN_REPICK)
                        break
            if session.player_count == 12 and route.is_lounge_12p_banned:
                warnings.append(WARN_ROUTE_BANNED_12P)

    return warnings
