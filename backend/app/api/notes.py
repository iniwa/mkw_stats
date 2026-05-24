import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Course, CourseNote, Route
from app.schemas import CourseNoteCreate, CourseNoteRead, CourseNoteUpdate

router = APIRouter(prefix="/api/v1", tags=["notes"])


@router.get("/notes", response_model=list[CourseNoteRead])
def list_notes(
    course_id: str | None = Query(None),
    route_id: str | None = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
) -> list[CourseNote]:
    if course_id and route_id:
        raise HTTPException(status_code=400, detail="course_id と route_id を同時に指定できません")
    q = select(CourseNote)
    if course_id:
        q = q.where(CourseNote.course_id == course_id)
    if route_id:
        q = q.where(CourseNote.route_id == route_id)
    if not include_inactive:
        q = q.where(CourseNote.is_active.is_(True))
    q = q.order_by(
        CourseNote.is_pinned.desc(),
        CourseNote.priority.desc(),
        CourseNote.created_at.desc(),
    )
    return list(db.scalars(q))


@router.post("/notes", response_model=CourseNoteRead, status_code=201)
def create_note(payload: CourseNoteCreate, db: Session = Depends(get_db)) -> CourseNote:
    if payload.course_id:
        if not db.get(Course, payload.course_id):
            raise HTTPException(status_code=404, detail=f"Course '{payload.course_id}' が見つかりません")
    else:
        if not db.get(Route, payload.route_id):
            raise HTTPException(status_code=404, detail=f"Route '{payload.route_id}' が見つかりません")
    note = CourseNote(**payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/notes/{note_id}", response_model=CourseNoteRead)
def update_note(
    note_id: uuid.UUID, payload: CourseNoteUpdate, db: Session = Depends(get_db)
) -> CourseNote:
    note = db.get(CourseNote, note_id)
    if not note or not note.is_active:
        raise HTTPException(status_code=404, detail="ノートが見つかりません")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    note = db.get(CourseNote, note_id)
    if not note or not note.is_active:
        raise HTTPException(status_code=404, detail="ノートが見つかりません")
    note.is_active = False
    db.commit()
