"""
Idempotent seed data. Running this script multiple times is safe.

Usage:
    cd backend
    DATABASE_URL=postgresql+psycopg://mkw:changeme@localhost:5432/mkw_stats \
        python -m app.seed.initial_data
"""
import uuid

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Course, MapPoint, Route, VrAccount


# ---------------------------------------------------------------------------
# Map points — normalized (x, y) coords in [0, 1]
# These are placeholder coordinates; update when the actual map image is set.
# ---------------------------------------------------------------------------
MAP_POINTS = [
    {"id": "mp_dk_pass",           "course_id": "dk_pass",            "label_ja": "DKパス",         "label_en": "DK Pass",          "x": 0.20, "y": 0.30},
    {"id": "mp_peach_stadium",     "course_id": "peach_stadium",      "label_ja": "ピーチスタジアム", "label_en": "Peach Stadium",    "x": 0.45, "y": 0.50},
    {"id": "mp_rainbow_road",      "course_id": "rainbow_road",       "label_ja": "レインボーロード", "label_en": "Rainbow Road",     "x": 0.70, "y": 0.20},
    {"id": "mp_mario_bros_circuit","course_id": "mario_bros_circuit", "label_ja": "マリオブラザーズサーキット", "label_en": "Mario Bros. Circuit", "x": 0.55, "y": 0.70},
    {"id": "mp_crown_city",        "course_id": "crown_city",         "label_ja": "クラウンシティ",   "label_en": "Crown City",       "x": 0.35, "y": 0.60},
]

COURSES = [
    {"id": "dk_pass",            "name_ja": "DKパス",                    "name_en": "DK Pass",             "sort_order": 10},
    {"id": "peach_stadium",      "name_ja": "ピーチスタジアム",          "name_en": "Peach Stadium",        "sort_order": 20},
    {"id": "rainbow_road",       "name_ja": "レインボーロード",          "name_en": "Rainbow Road",         "sort_order": 30},
    {"id": "mario_bros_circuit", "name_ja": "マリオブラザーズサーキット","name_en": "Mario Bros. Circuit",  "sort_order": 40},
    {"id": "crown_city",         "name_ja": "クラウンシティ",            "name_en": "Crown City",           "sort_order": 50},
]

# Same-point 3-lap routes: from == to means "standard 3-lap on this course"
# At least one same-point mapping required by handoff.
ROUTES = [
    {
        "id": "rt_dk_pass_3lap",
        "from_course_id": "dk_pass",
        "to_course_id": "dk_pass",
        "name_ja": "DKパス（3周）",
        "name_en": "DK Pass (3-lap)",
        "is_lounge_12p_banned": False,
        "repick_group_key": "dk_pass",
        "sort_order": 10,
    },
    {
        "id": "rt_peach_to_rainbow",
        "from_course_id": "peach_stadium",
        "to_course_id": "rainbow_road",
        "name_ja": "ピーチスタジアム→レインボーロード",
        "name_en": "Peach Stadium → Rainbow Road",
        "is_lounge_12p_banned": True,  # 12人Loungeでの道中コース禁止例
        "repick_group_key": "peach_rainbow",
        "sort_order": 20,
    },
]

VR_ACCOUNTS = [
    {
        "name": "main",
        "display_name": "メインアカウント",
        "initial_vr": 0,
        "current_vr": 0,
        "is_active": True,
        "sort_order": 0,
    }
]


def seed(session) -> None:
    # Courses
    for c_data in COURSES:
        existing = session.get(Course, c_data["id"])
        if existing is None:
            session.add(Course(**c_data))

    session.flush()

    # Map points
    for mp_data in MAP_POINTS:
        existing = session.get(MapPoint, mp_data["id"])
        if existing is None:
            session.add(MapPoint(**mp_data))

    session.flush()

    # Routes
    for r_data in ROUTES:
        existing = session.get(Route, r_data["id"])
        if existing is None:
            session.add(Route(**r_data))

    session.flush()

    # VR accounts — only insert if name doesn't exist
    for va_data in VR_ACCOUNTS:
        stmt = select(VrAccount).where(VrAccount.name == va_data["name"])
        existing = session.scalars(stmt).first()
        if existing is None:
            session.add(VrAccount(id=uuid.uuid4(), **va_data))

    session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
