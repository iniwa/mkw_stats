import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Course, CourseNote, MapAnnotation, Route
from app.schemas import MapAnnotationCreate, MapAnnotationRead, MapAnnotationUpdate

router = APIRouter(prefix="/api/v1", tags=["map-annotations"])


def _check_note_target(
    db: Session, note_id: uuid.UUID, course_id: str | None, route_id: str | None
) -> None:
    note = db.get(CourseNote, note_id)
    if not note or not note.is_active:
        raise HTTPException(status_code=404, detail=f"Note '{note_id}' が見つかりません")
    if course_id and note.course_id != course_id:
        raise HTTPException(status_code=400, detail="note_id が指定の course_id を対象としていません")
    if route_id and note.route_id != route_id:
        raise HTTPException(status_code=400, detail="note_id が指定の route_id を対象としていません")


@router.get("/map-annotations", response_model=list[MapAnnotationRead])
def list_annotations(
    course_id: str | None = Query(None),
    route_id: str | None = Query(None),
    note_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
) -> list[MapAnnotation]:
    if course_id and route_id:
        raise HTTPException(status_code=400, detail="course_id と route_id を同時に指定できません")
    q = select(MapAnnotation)
    if course_id:
        q = q.where(MapAnnotation.course_id == course_id)
    if route_id:
        q = q.where(MapAnnotation.route_id == route_id)
    if note_id:
        q = q.where(MapAnnotation.note_id == note_id)
    q = q.order_by(
        MapAnnotation.priority.desc(),
        MapAnnotation.label.asc(),
        MapAnnotation.id.asc(),
    )
    return list(db.scalars(q))


@router.post("/map-annotations", response_model=MapAnnotationRead, status_code=201)
def create_annotation(payload: MapAnnotationCreate, db: Session = Depends(get_db)) -> MapAnnotation:
    if payload.course_id:
        if not db.get(Course, payload.course_id):
            raise HTTPException(status_code=404, detail=f"Course '{payload.course_id}' が見つかりません")
    else:
        if not db.get(Route, payload.route_id):
            raise HTTPException(status_code=404, detail=f"Route '{payload.route_id}' が見つかりません")
    if payload.note_id:
        _check_note_target(db, payload.note_id, payload.course_id, payload.route_id)
    annotation = MapAnnotation(**payload.model_dump())
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


@router.patch("/map-annotations/{annotation_id}", response_model=MapAnnotationRead)
def update_annotation(
    annotation_id: uuid.UUID,
    payload: MapAnnotationUpdate,
    db: Session = Depends(get_db),
) -> MapAnnotation:
    annotation = db.get(MapAnnotation, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="アノテーションが見つかりません")
    updates = payload.model_dump(exclude_unset=True)
    if "note_id" in updates and updates["note_id"] is not None:
        _check_note_target(db, updates["note_id"], annotation.course_id, annotation.route_id)
    for k, v in updates.items():
        setattr(annotation, k, v)
    db.commit()
    db.refresh(annotation)
    return annotation


@router.delete("/map-annotations/{annotation_id}", status_code=204)
def delete_annotation(annotation_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    annotation = db.get(MapAnnotation, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="アノテーションが見つかりません")
    db.delete(annotation)
    db.commit()
