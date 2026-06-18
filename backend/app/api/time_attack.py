from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Course, TimeAttackRecord
from app.models.enums import TimeAttackCategory
from app.schemas import TimeAttackRecordRead, TimeAttackRecordUpdate

router = APIRouter(prefix="/api/v1", tags=["time-attack"])


@router.get("/time-attack-records", response_model=list[TimeAttackRecordRead])
def list_time_attack_records(
    category: TimeAttackCategory | None = Query(None),
    db: Session = Depends(get_db),
) -> list[TimeAttackRecord]:
    q = select(TimeAttackRecord).join(Course, TimeAttackRecord.course_id == Course.id)
    if category is not None:
        q = q.where(TimeAttackRecord.category == category)
        q = q.order_by(Course.sort_order, Course.id)
    else:
        q = q.order_by(Course.sort_order, Course.id, TimeAttackRecord.category)
    return list(db.scalars(q))


@router.put(
    "/time-attack-records/{course_id}/{category}",
    response_model=TimeAttackRecordRead,
)
def upsert_time_attack_record(
    course_id: str,
    category: TimeAttackCategory,
    payload: TimeAttackRecordUpdate,
    db: Session = Depends(get_db),
) -> TimeAttackRecord:
    if db.get(Course, course_id) is None:
        raise HTTPException(status_code=404, detail=f"Course '{course_id}' が見つかりません")

    record = db.scalar(
        select(TimeAttackRecord).where(
            TimeAttackRecord.course_id == course_id,
            TimeAttackRecord.category == category,
        )
    )
    data = payload.model_dump(exclude_unset=True)

    if record is not None:
        for k, v in data.items():
            setattr(record, k, v)
    else:
        record = TimeAttackRecord(course_id=course_id, category=category, **data)
        db.add(record)

    db.commit()
    db.refresh(record)
    return record
