from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Course, MapPoint, Route
from app.schemas import (
    CourseRead,
    CourseSearchResult,
    CourseSelectionResolveRequest,
    CourseSelectionResolveResponse,
    MapPointRead,
    MapPointUpdate,
    RouteRead,
)
from app.services import course_selection

router = APIRouter(prefix="/api/v1", tags=["courses"])


@router.get("/courses", response_model=list[CourseRead])
def list_courses(db: Session = Depends(get_db)) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.sort_order, Course.id)))


@router.get("/routes", response_model=list[RouteRead])
def list_routes(db: Session = Depends(get_db)) -> list[Route]:
    return list(db.scalars(select(Route).order_by(Route.sort_order, Route.id)))


@router.get("/map-points", response_model=list[MapPointRead])
def list_map_points(db: Session = Depends(get_db)) -> list[MapPoint]:
    return list(db.scalars(select(MapPoint).order_by(MapPoint.id)))


@router.patch("/map-points/{map_point_id}", response_model=MapPointRead)
def update_map_point(
    map_point_id: str,
    payload: MapPointUpdate,
    db: Session = Depends(get_db),
) -> MapPoint:
    mp = db.get(MapPoint, map_point_id)
    if mp is None:
        raise HTTPException(status_code=404, detail="Map point not found")
    if payload.x is not None:
        mp.x = payload.x
    if payload.y is not None:
        mp.y = payload.y
    if payload.radius is not None:
        mp.radius = payload.radius
    db.commit()
    db.refresh(mp)
    return mp


@router.get("/course-search", response_model=CourseSearchResult)
def course_search(
    q: str = Query(..., min_length=1), db: Session = Depends(get_db)
) -> CourseSearchResult:
    return course_selection.search_courses(db, q)


@router.post("/course-selection/resolve", response_model=CourseSelectionResolveResponse)
def resolve_course_selection(
    payload: CourseSelectionResolveRequest, db: Session = Depends(get_db)
) -> CourseSelectionResolveResponse:
    return course_selection.resolve_selection(
        db, payload.from_map_point_id, payload.to_map_point_id
    )
