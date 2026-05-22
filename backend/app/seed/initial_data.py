# -*- coding: utf-8 -*-
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
# Courses — 30 Mario Kart World tracks sourced from the reference page:
# https://japan-mk.blog.jp/mkworld.info-1/route.html
# English names are derived from the suggested stable IDs in the handoff.
# Naming policy is recorded in docs/decisions/2026-05-22-course-master-seed-strategy.md.
# ---------------------------------------------------------------------------
COURSES = [
    {"id": "mario_bros_circuit",   "name_ja": "マリオブラザーズサーキット", "name_en": "Mario Bros. Circuit",   "sort_order": 10},
    {"id": "crown_city",           "name_ja": "トロフィーシティ",            "name_en": "Trophy City",            "sort_order": 20},
    {"id": "whistlestop_summit",   "name_ja": "シュポポコースター",           "name_en": "Whistlestop Summit",     "sort_order": 30},
    {"id": "dk_spaceport",         "name_ja": "DKうちゅうセンター",           "name_en": "DK Spaceport",           "sort_order": 40},
    {"id": "desert_hills",         "name_ja": "サンサンさばく",               "name_en": "Desert Hills",           "sort_order": 50},
    {"id": "shy_guy_bazaar",       "name_ja": "ヘイホーカーニバル",           "name_en": "Shy Guy Bazaar",         "sort_order": 60},
    {"id": "wario_stadium",        "name_ja": "ワリオスタジアム",             "name_en": "Wario Stadium",          "sort_order": 70},
    {"id": "airship_fortress",     "name_ja": "キラーシップ",                 "name_en": "Airship Fortress",       "sort_order": 80},
    {"id": "dk_pass",              "name_ja": "DKスノーマウンテン",           "name_en": "DK Snow Mountain",       "sort_order": 90},
    {"id": "starview_peak",        "name_ja": "ロゼッタてんもんだい",         "name_en": "Starview Peak",          "sort_order": 100},
    {"id": "sky_high_sundae",      "name_ja": "アイスビルディング",           "name_en": "Sky-High Sundae",        "sort_order": 110},
    {"id": "wario_shipyard",       "name_ja": "ワリオシップ",                 "name_en": "Wario Shipyard",         "sort_order": 120},
    {"id": "koopa_troopa_beach",   "name_ja": "ノコノコビーチ",               "name_en": "Koopa Troopa Beach",     "sort_order": 130},
    {"id": "faraway_oasis",        "name_ja": "リバーサイドサファリ",         "name_en": "Faraway Oasis",          "sort_order": 140},
    {"id": "peach_beach",          "name_ja": "ピーチビーチ",                 "name_en": "Peach Beach",            "sort_order": 150},
    {"id": "salty_salty_speedway", "name_ja": "ソルティータウン",             "name_en": "Salty Salty Speedway",   "sort_order": 160},
    {"id": "dino_dino_jungle",     "name_ja": "ディノディノジャングル",       "name_en": "Dino Dino Jungle",       "sort_order": 170},
    {"id": "great_block_ruins",    "name_ja": "ハテナしんでん",               "name_en": "Great Block Ruins",      "sort_order": 180},
    {"id": "cheep_cheep_falls",    "name_ja": "プクプクフォールズ",           "name_en": "Cheep Cheep Falls",      "sort_order": 190},
    {"id": "dandelion_depths",     "name_ja": "ショーニューロード",           "name_en": "Dandelion Depths",       "sort_order": 200},
    {"id": "boo_cinema",           "name_ja": "おばけシネマ",                 "name_en": "Boo Cinema",             "sort_order": 210},
    {"id": "dry_bones_burnout",    "name_ja": "ホネホネツイスター",           "name_en": "Dry Bones Burnout",      "sort_order": 220},
    {"id": "moo_moo_meadows",      "name_ja": "モーモーカントリー",           "name_en": "Moo Moo Meadows",        "sort_order": 230},
    {"id": "choco_mountain",       "name_ja": "チョコマウンテン",             "name_en": "Choco Mountain",         "sort_order": 240},
    {"id": "toads_factory",        "name_ja": "キノピオファクトリー",         "name_en": "Toad's Factory",         "sort_order": 250},
    {"id": "bowsers_castle",       "name_ja": "クッパキャッスル",             "name_en": "Bowser's Castle",        "sort_order": 260},
    {"id": "acorn_heights",        "name_ja": "どんぐりツリーハウス",         "name_en": "Acorn Heights",          "sort_order": 270},
    {"id": "mario_circuit",        "name_ja": "マリオサーキット",             "name_en": "Mario Circuit",          "sort_order": 280},
    {"id": "peach_stadium",        "name_ja": "ピーチスタジアム",             "name_en": "Peach Stadium",          "sort_order": 290},
    {"id": "rainbow_road",         "name_ja": "レインボーロード",             "name_en": "Rainbow Road",           "sort_order": 300},
]

# ---------------------------------------------------------------------------
# Map points — one per course, normalized (x, y) coords in [0, 1].
# Coordinates are placeholders arranged on a 6×5 grid; update when the
# actual map image and point placement are chosen.
# ---------------------------------------------------------------------------
MAP_POINTS = [
    {"id": "mp_mario_bros_circuit",   "course_id": "mario_bros_circuit",   "label_ja": "マリオブラザーズサーキット", "label_en": "Mario Bros. Circuit",   "x": 0.10, "y": 0.10},
    {"id": "mp_crown_city",           "course_id": "crown_city",           "label_ja": "トロフィーシティ",            "label_en": "Trophy City",            "x": 0.26, "y": 0.10},
    {"id": "mp_whistlestop_summit",   "course_id": "whistlestop_summit",   "label_ja": "シュポポコースター",           "label_en": "Whistlestop Summit",     "x": 0.42, "y": 0.10},
    {"id": "mp_dk_spaceport",         "course_id": "dk_spaceport",         "label_ja": "DKうちゅうセンター",           "label_en": "DK Spaceport",           "x": 0.58, "y": 0.10},
    {"id": "mp_desert_hills",         "course_id": "desert_hills",         "label_ja": "サンサンさばく",               "label_en": "Desert Hills",           "x": 0.74, "y": 0.10},
    {"id": "mp_shy_guy_bazaar",       "course_id": "shy_guy_bazaar",       "label_ja": "ヘイホーカーニバル",           "label_en": "Shy Guy Bazaar",         "x": 0.90, "y": 0.10},
    {"id": "mp_wario_stadium",        "course_id": "wario_stadium",        "label_ja": "ワリオスタジアム",             "label_en": "Wario Stadium",          "x": 0.10, "y": 0.30},
    {"id": "mp_airship_fortress",     "course_id": "airship_fortress",     "label_ja": "キラーシップ",                 "label_en": "Airship Fortress",       "x": 0.26, "y": 0.30},
    {"id": "mp_dk_pass",              "course_id": "dk_pass",              "label_ja": "DKスノーマウンテン",           "label_en": "DK Snow Mountain",       "x": 0.42, "y": 0.30},
    {"id": "mp_starview_peak",        "course_id": "starview_peak",        "label_ja": "ロゼッタてんもんだい",         "label_en": "Starview Peak",          "x": 0.58, "y": 0.30},
    {"id": "mp_sky_high_sundae",      "course_id": "sky_high_sundae",      "label_ja": "アイスビルディング",           "label_en": "Sky-High Sundae",        "x": 0.74, "y": 0.30},
    {"id": "mp_wario_shipyard",       "course_id": "wario_shipyard",       "label_ja": "ワリオシップ",                 "label_en": "Wario Shipyard",         "x": 0.90, "y": 0.30},
    {"id": "mp_koopa_troopa_beach",   "course_id": "koopa_troopa_beach",   "label_ja": "ノコノコビーチ",               "label_en": "Koopa Troopa Beach",     "x": 0.10, "y": 0.50},
    {"id": "mp_faraway_oasis",        "course_id": "faraway_oasis",        "label_ja": "リバーサイドサファリ",         "label_en": "Faraway Oasis",          "x": 0.26, "y": 0.50},
    {"id": "mp_peach_beach",          "course_id": "peach_beach",          "label_ja": "ピーチビーチ",                 "label_en": "Peach Beach",            "x": 0.42, "y": 0.50},
    {"id": "mp_salty_salty_speedway", "course_id": "salty_salty_speedway", "label_ja": "ソルティータウン",             "label_en": "Salty Salty Speedway",   "x": 0.58, "y": 0.50},
    {"id": "mp_dino_dino_jungle",     "course_id": "dino_dino_jungle",     "label_ja": "ディノディノジャングル",       "label_en": "Dino Dino Jungle",       "x": 0.74, "y": 0.50},
    {"id": "mp_great_block_ruins",    "course_id": "great_block_ruins",    "label_ja": "ハテナしんでん",               "label_en": "Great Block Ruins",      "x": 0.90, "y": 0.50},
    {"id": "mp_cheep_cheep_falls",    "course_id": "cheep_cheep_falls",    "label_ja": "プクプクフォールズ",           "label_en": "Cheep Cheep Falls",      "x": 0.10, "y": 0.70},
    {"id": "mp_dandelion_depths",     "course_id": "dandelion_depths",     "label_ja": "ショーニューロード",           "label_en": "Dandelion Depths",       "x": 0.26, "y": 0.70},
    {"id": "mp_boo_cinema",           "course_id": "boo_cinema",           "label_ja": "おばけシネマ",                 "label_en": "Boo Cinema",             "x": 0.42, "y": 0.70},
    {"id": "mp_dry_bones_burnout",    "course_id": "dry_bones_burnout",    "label_ja": "ホネホネツイスター",           "label_en": "Dry Bones Burnout",      "x": 0.58, "y": 0.70},
    {"id": "mp_moo_moo_meadows",      "course_id": "moo_moo_meadows",      "label_ja": "モーモーカントリー",           "label_en": "Moo Moo Meadows",        "x": 0.74, "y": 0.70},
    {"id": "mp_choco_mountain",       "course_id": "choco_mountain",       "label_ja": "チョコマウンテン",             "label_en": "Choco Mountain",         "x": 0.90, "y": 0.70},
    {"id": "mp_toads_factory",        "course_id": "toads_factory",        "label_ja": "キノピオファクトリー",         "label_en": "Toad's Factory",         "x": 0.10, "y": 0.90},
    {"id": "mp_bowsers_castle",       "course_id": "bowsers_castle",       "label_ja": "クッパキャッスル",             "label_en": "Bowser's Castle",        "x": 0.26, "y": 0.90},
    {"id": "mp_acorn_heights",        "course_id": "acorn_heights",        "label_ja": "どんぐりツリーハウス",         "label_en": "Acorn Heights",          "x": 0.42, "y": 0.90},
    {"id": "mp_mario_circuit",        "course_id": "mario_circuit",        "label_ja": "マリオサーキット",             "label_en": "Mario Circuit",          "x": 0.58, "y": 0.90},
    {"id": "mp_peach_stadium",        "course_id": "peach_stadium",        "label_ja": "ピーチスタジアム",             "label_en": "Peach Stadium",          "x": 0.74, "y": 0.90},
    {"id": "mp_rainbow_road",         "course_id": "rainbow_road",         "label_ja": "レインボーロード",             "label_en": "Rainbow Road",           "x": 0.90, "y": 0.90},
]

# Same-point 3-lap routes: from == to means "standard 3-lap on this course"
# At least one same-point mapping required by handoff.
ROUTES = [
    {
        "id": "rt_dk_pass_3lap",
        "from_course_id": "dk_pass",
        "to_course_id": "dk_pass",
        "name_ja": "DKスノーマウンテン（3周）",
        "name_en": "DK Snow Mountain (3-lap)",
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
        "is_lounge_12p_banned": True,
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
