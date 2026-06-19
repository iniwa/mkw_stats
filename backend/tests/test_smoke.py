"""Smoke tests — no live DB required."""
import importlib
import uuid

import pytest


def test_config_import():
    """Config module loads and exports DATABASE_URL."""
    from app.core import config
    assert hasattr(config, "DATABASE_URL")
    assert config.DATABASE_URL.startswith("postgresql+psycopg://")


def test_psycopg_scheme_rewrite():
    """Plain postgresql:// URL is rewritten to postgresql+psycopg://."""
    import os
    import importlib
    import sys

    os.environ["DATABASE_URL"] = "postgresql://user:pass@host/db"
    # Reload to pick up the env var
    if "app.core.config" in sys.modules:
        del sys.modules["app.core.config"]
    from app.core import config as reloaded
    assert reloaded.DATABASE_URL.startswith("postgresql+psycopg://")
    # Clean up
    del os.environ["DATABASE_URL"]


def test_enums_values():
    """All required enum members are present."""
    from app.models.enums import AnnotationType, PlacementBand, RaceStatus, SessionStatus, SourceType

    assert set(SourceType) == {SourceType.ranked, SourceType.lounge}
    assert RaceStatus.draft in RaceStatus
    assert RaceStatus.completed in RaceStatus
    assert RaceStatus.cancelled in RaceStatus
    assert SessionStatus.active in SessionStatus
    assert PlacementBand.top in PlacementBand
    assert AnnotationType.pin in AnnotationType
    assert AnnotationType.area in AnnotationType


def test_model_metadata_tables():
    """All expected tables are registered in SQLAlchemy metadata."""
    from app.models import Base

    expected = {
        "vr_accounts",
        "app_settings",
        "play_sessions",
        "race_records",
        "rating_snapshots",
        "courses",
        "routes",
        "route_repick_equivalents",
        "map_points",
        "course_aliases",
        "course_notes",
        "map_annotations",
        "uploaded_files",
        "lounge_tables",
        "lounge_table_players",
        "characters",
        "vehicles",
        "item_tables",
        "time_attack_records",
    }
    actual = set(Base.metadata.tables.keys())
    assert expected == actual, f"Missing: {expected - actual}, Extra: {actual - expected}"


def test_race_record_course_xor_route_constraint_present():
    """race_records table has the course XOR route check constraint."""
    from app.models import Base

    table = Base.metadata.tables["race_records"]
    constraint_names = {c.name for c in table.constraints}
    assert "chk_race_records_course_xor_route" in constraint_names


def test_course_route_reference_column_types():
    """Race records reference string course/route master IDs, not UUIDs."""
    from sqlalchemy import String

    from app.models import Base

    race_records = Base.metadata.tables["race_records"]
    assert isinstance(race_records.c.course_id.type, String)
    assert isinstance(race_records.c.route_id.type, String)


def test_map_point_owns_course_reference():
    """Map points are the canonical owner of course map placement."""
    from app.models import Base

    courses = Base.metadata.tables["courses"]
    map_points = Base.metadata.tables["map_points"]

    assert "map_point_id" not in courses.c
    assert "course_id" in map_points.c


def test_seed_data_idempotent_logic():
    """Seed data lists have no duplicate IDs."""
    from app.seed.initial_data import COURSES, MAP_POINTS, ROUTES, VR_ACCOUNTS

    course_ids = [c["id"] for c in COURSES]
    assert len(course_ids) == len(set(course_ids)), "Duplicate course id"

    mp_ids = [mp["id"] for mp in MAP_POINTS]
    assert len(mp_ids) == len(set(mp_ids)), "Duplicate map_point id"

    route_ids = [r["id"] for r in ROUTES]
    assert len(route_ids) == len(set(route_ids)), "Duplicate route id"

    va_names = [v["name"] for v in VR_ACCOUNTS]
    assert len(va_names) == len(set(va_names)), "Duplicate vr_account name"


def test_seed_has_same_point_route():
    """Seed includes at least one same-point 3-lap route (from == to)."""
    from app.seed.initial_data import ROUTES

    same_point = [r for r in ROUTES if r["from_course_id"] == r["to_course_id"]]
    assert len(same_point) >= 1, "No same-point (3-lap) route in seed data"


def test_seed_has_lounge_12p_banned_route():
    """Seed includes at least one route marked as 12p Lounge banned."""
    from app.seed.initial_data import ROUTES

    banned = [r for r in ROUTES if r.get("is_lounge_12p_banned")]
    assert len(banned) >= 1, "No 12p-banned route in seed data"


def test_seed_map_points_all_reference_valid_courses():
    """Every MAP_POINTS entry references a course_id that exists in COURSES."""
    from app.seed.initial_data import COURSES, MAP_POINTS

    course_ids = {c["id"] for c in COURSES}
    for mp in MAP_POINTS:
        assert mp["course_id"] in course_ids, (
            f"map_point {mp['id']} references unknown course {mp['course_id']}"
        )


def test_seed_routes_all_reference_valid_courses():
    """Every ROUTES entry references from/to course_ids that exist in COURSES."""
    from app.seed.initial_data import COURSES, ROUTES

    course_ids = {c["id"] for c in COURSES}
    for r in ROUTES:
        assert r["from_course_id"] in course_ids, (
            f"route {r['id']} from_course_id {r['from_course_id']} not in COURSES"
        )
        assert r["to_course_id"] in course_ids, (
            f"route {r['id']} to_course_id {r['to_course_id']} not in COURSES"
        )


def test_seed_route_count():
    """Seed contains the expected number of routes (202 transit + 30 same-course 3-lap)."""
    from app.seed.initial_data import ROUTES

    assert len(ROUTES) == 232, f"Expected 232 routes, got {len(ROUTES)}"


def test_seed_routes_tags_have_required_fields():
    """Reference routes have source, source_key, sections in tags."""
    from app.seed.initial_data import ROUTES

    for r in ROUTES:
        tags = r.get("tags")
        if tags is None:
            continue
        assert isinstance(tags, dict), f"route {r['id']} tags should be dict, got {type(tags)}"
        assert "source" in tags, f"route {r['id']} tags missing 'source'"
        assert "source_key" in tags, f"route {r['id']} tags missing 'source_key'"
        assert "sections" in tags, f"route {r['id']} tags missing 'sections'"


def test_seed_sync_fields_updates_existing_master_records():
    """Seed master data can refresh existing course/route rows by stable ID."""
    from app.seed.initial_data import _sync_seed_fields

    class Existing:
        name_ja = "old"
        tags = None

    existing = Existing()
    _sync_seed_fields(existing, {"name_ja": "new", "tags": {"source": "test"}})

    assert existing.name_ja == "new"
    assert existing.tags == {"source": "test"}


def test_seed_map_point_fresh_insert_uses_seed_coordinates(db_session):
    """A fresh seed inserts map points with their seed-defined coordinates."""
    from app.models import MapPoint
    from app.seed.initial_data import seed

    seed(db_session)

    mp = db_session.get(MapPoint, "mp_rainbow_road")
    assert mp is not None
    # Seed grid value for rainbow_road.
    assert mp.x == 0.90
    assert mp.y == 0.90


def test_seed_preserves_user_calibrated_map_point_coordinates(db_session):
    """After calibration, a re-seed preserves x/y/radius but still restores
    non-coordinate seed-owned master fields (proving only calibration is excluded)."""
    from app.models import MapPoint
    from app.seed.initial_data import seed

    seed(db_session)

    mp = db_session.get(MapPoint, "mp_rainbow_road")
    # Calibrate to values clearly different from the placeholder grid.
    mp.x = 0.137
    mp.y = 0.482
    mp.radius = 0.061
    # Clobber a seed-owned field so we can prove it is re-synced.
    mp.label_ja = "ユーザー編集ラベル"
    db_session.commit()

    seed(db_session)

    mp_after = db_session.get(MapPoint, "mp_rainbow_road")
    # Calibration is user-managed and must survive the re-seed exactly.
    assert mp_after.x == 0.137
    assert mp_after.y == 0.482
    assert mp_after.radius == 0.061
    # Non-coordinate seed-owned master field is restored from the seed.
    assert mp_after.label_ja == "レインボーロード"


def _active_accounts(session):
    from sqlalchemy import select

    from app.models import VrAccount

    return session.scalars(select(VrAccount).where(VrAccount.is_active.is_(True))).all()


def _account_by_name(session, name):
    from sqlalchemy import select

    from app.models import VrAccount

    return session.scalars(select(VrAccount).where(VrAccount.name == name)).first()


def test_seed_vr_account_empty_db_creates_active_main(db_session):
    """On a fresh DB the seed creates `main` as the single active account."""
    from app.seed.initial_data import seed

    seed(db_session)

    main = _account_by_name(db_session, "main")
    assert main is not None
    assert main.is_active is True

    active = _active_accounts(db_session)
    assert len(active) == 1
    assert active[0].name == "main"


def test_seed_vr_account_preserves_existing_active_account(db_session):
    """With an active custom account and no `main`, seed adds `main` inactive
    and leaves the user's active account untouched."""
    from app.models import VrAccount
    from app.seed.initial_data import seed

    custom = VrAccount(
        id=uuid.uuid4(),
        name="iniwa",
        display_name="いにわ",
        initial_vr=8000,
        current_vr=8630,
        is_active=True,
        sort_order=5,
    )
    db_session.add(custom)
    db_session.commit()

    seed(db_session)

    iniwa = _account_by_name(db_session, "iniwa")
    assert iniwa.is_active is True
    # User-managed fields must be preserved exactly.
    assert iniwa.display_name == "いにわ"
    assert iniwa.initial_vr == 8000
    assert iniwa.current_vr == 8630
    assert iniwa.sort_order == 5

    main = _account_by_name(db_session, "main")
    assert main is not None
    assert main.is_active is False

    active = _active_accounts(db_session)
    assert len(active) == 1
    assert active[0].name == "iniwa"


def test_seed_vr_account_repeated_run_is_stable(db_session):
    """Re-running the seed does not duplicate `main` or change the active account."""
    from sqlalchemy import func, select

    from app.models import VrAccount
    from app.seed.initial_data import seed

    custom = VrAccount(
        id=uuid.uuid4(),
        name="iniwa",
        display_name="いにわ",
        initial_vr=8000,
        current_vr=8630,
        is_active=True,
        sort_order=5,
    )
    db_session.add(custom)
    db_session.commit()

    seed(db_session)
    seed(db_session)

    main_count = db_session.scalar(
        select(func.count()).select_from(VrAccount).where(VrAccount.name == "main")
    )
    assert main_count == 1

    active = _active_accounts(db_session)
    assert len(active) == 1
    assert active[0].name == "iniwa"

    iniwa = _account_by_name(db_session, "iniwa")
    assert iniwa.display_name == "いにわ"
    assert iniwa.initial_vr == 8000
    assert iniwa.current_vr == 8630
    assert iniwa.sort_order == 5


def test_seed_vr_account_leaves_existing_inactive_main_untouched(db_session):
    """An existing inactive `main` is left as-is even when another account is active."""
    from app.models import VrAccount
    from app.seed.initial_data import seed

    main = VrAccount(
        id=uuid.uuid4(),
        name="main",
        display_name="旧メイン",
        initial_vr=100,
        current_vr=200,
        is_active=False,
        sort_order=3,
    )
    active = VrAccount(
        id=uuid.uuid4(),
        name="iniwa",
        display_name="いにわ",
        initial_vr=8000,
        current_vr=8630,
        is_active=True,
        sort_order=5,
    )
    db_session.add_all([main, active])
    db_session.commit()

    seed(db_session)

    main_after = _account_by_name(db_session, "main")
    assert main_after.is_active is False
    # User-managed fields on the existing seed account are not overwritten.
    assert main_after.display_name == "旧メイン"
    assert main_after.initial_vr == 100
    assert main_after.current_vr == 200
    assert main_after.sort_order == 3

    iniwa_after = _account_by_name(db_session, "iniwa")
    assert iniwa_after.is_active is True

    active_accounts = _active_accounts(db_session)
    assert len(active_accounts) == 1
    assert active_accounts[0].name == "iniwa"
