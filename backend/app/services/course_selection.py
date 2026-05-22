"""Resolve clicked map points into a normal course or a route.

See mkworld_stats_manager_docs_v0_1/05_api_design.md and the
docs/decisions/2026-05-22-map-point-course-ownership.md decision: map points
own the course reference, so selection always resolves through map_points.course_id.
"""
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Course, MapPoint, Route
from app.schemas import (
    CourseRead,
    CourseSearchResult,
    CourseSelectionResolveResponse,
    RouteRead,
)


def course_label(course: Course) -> str:
    return course.name_en or course.name_ja


def route_label(route: Route, from_course: Course, to_course: Course) -> str:
    return f"{course_label(from_course)} → {course_label(to_course)}"


def resolve_selection(
    db: Session,
    from_map_point_id: str,
    to_map_point_id: str,
) -> CourseSelectionResolveResponse:
    from_mp = db.get(MapPoint, from_map_point_id)
    if from_mp is None:
        raise HTTPException(404, f"map point not found: {from_map_point_id}")
    to_mp = db.get(MapPoint, to_map_point_id)
    if to_mp is None:
        raise HTTPException(404, f"map point not found: {to_map_point_id}")

    if from_mp.course_id is None or to_mp.course_id is None:
        raise HTTPException(400, "selected map point is not linked to a course")

    from_course = db.get(Course, from_mp.course_id)
    to_course = db.get(Course, to_mp.course_id)
    if from_course is None or to_course is None:
        raise HTTPException(400, "map point references a missing course")

    # Same course on both ends -> a normal 3-lap course.
    if from_course.id == to_course.id:
        name = course_label(from_course)
        display = f"{name} → {name}"
        return CourseSelectionResolveResponse(
            kind="course",
            course=CourseRead.model_validate(from_course),
            display_name=display,
            confirm_message=f"{display} でいいですか？",
        )

    # Different courses -> resolve to a route if one is defined.
    route = db.scalars(
        select(Route).where(
            Route.from_course_id == from_course.id,
            Route.to_course_id == to_course.id,
        )
    ).first()
    if route is None:
        raise HTTPException(
            404,
            f"no route defined from {from_course.id} to {to_course.id}",
        )

    display = route_label(route, from_course, to_course)
    return CourseSelectionResolveResponse(
        kind="route",
        route=RouteRead.model_validate(route),
        display_name=display,
        confirm_message=f"{display} でいいですか？",
    )


def search_courses(db: Session, query: str) -> CourseSearchResult:
    like = f"%{query}%"
    courses = db.scalars(
        select(Course)
        .where(
            or_(
                Course.name_ja.ilike(like),
                Course.name_en.ilike(like),
                Course.short_name.ilike(like),
                Course.id.ilike(like),
            )
        )
        .order_by(Course.sort_order)
    ).all()
    routes = db.scalars(
        select(Route)
        .where(
            or_(
                Route.name_ja.ilike(like),
                Route.name_en.ilike(like),
                Route.short_name.ilike(like),
                Route.id.ilike(like),
            )
        )
        .order_by(Route.sort_order)
    ).all()
    return CourseSearchResult(
        courses=[CourseRead.model_validate(c) for c in courses],
        routes=[RouteRead.model_validate(r) for r in routes],
    )
