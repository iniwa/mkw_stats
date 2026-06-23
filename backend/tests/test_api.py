"""API-level tests for the v1 backend slice (SQLite-backed — see conftest.py)."""
import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import select

from app.models import PlaySession, RaceRecord, RatingSnapshot, VrAccount
from app.models.enums import RaceStatus, SessionStatus, SourceType
from app.services import lounge_mmr


def test_health_still_ok(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "mkw-stats-backend"}


def test_settings_default_creation(client):
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == 1
    assert body["lounge_auto_sync"] is False
    assert body["selected_vr_account_id"] is None


def test_settings_patch(client):
    resp = client.patch("/api/v1/settings", json={"lounge_player_id": "abc123"})
    assert resp.status_code == 200
    assert resp.json()["lounge_player_id"] == "abc123"


def test_vr_account_activation_leaves_one_active(seeded_client, db_session):
    # Seed provides one active account ("main").
    a = seeded_client.post(
        "/api/v1/vr-accounts", json={"name": "alt1", "display_name": "Alt 1"}
    ).json()
    b = seeded_client.post(
        "/api/v1/vr-accounts", json={"name": "alt2", "display_name": "Alt 2"}
    ).json()
    assert a["is_active"] is False and b["is_active"] is False

    resp = seeded_client.post(f"/api/v1/vr-accounts/{b['id']}/activate")
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True

    accounts = seeded_client.get("/api/v1/vr-accounts").json()
    active = [acc for acc in accounts if acc["is_active"]]
    assert len(active) == 1
    assert active[0]["id"] == b["id"]


def test_delete_active_vr_account_rejected(seeded_client):
    accounts = seeded_client.get("/api/v1/vr-accounts").json()
    active = next(acc for acc in accounts if acc["is_active"])
    resp = seeded_client.delete(f"/api/v1/vr-accounts/{active['id']}")
    assert resp.status_code == 400


def test_course_selection_resolve_same_point_is_3lap_route(seeded_client):
    resp = seeded_client.post(
        "/api/v1/course-selection/resolve",
        json={"from_map_point_id": "mp_dk_pass", "to_map_point_id": "mp_dk_pass"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "route"
    assert body["route"]["id"] == "rt_dk_pass_3lap"
    assert body["route"]["from_course_id"] == "dk_pass"
    assert body["route"]["to_course_id"] == "dk_pass"
    assert body["course"] is None
    assert body["confirm_message"].endswith("でいいですか？")


def test_course_selection_resolve_different_points_is_route(seeded_client):
    resp = seeded_client.post(
        "/api/v1/course-selection/resolve",
        json={
            "from_map_point_id": "mp_peach_stadium",
            "to_map_point_id": "mp_rainbow_road",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "route"
    assert body["route"]["id"] == "rt_peach_to_rainbow"
    assert body["course"] is None


def test_course_selection_resolve_no_route_is_404(seeded_client):
    resp = seeded_client.post(
        "/api/v1/course-selection/resolve",
        json={
            "from_map_point_id": "mp_crown_city",
            "to_map_point_id": "mp_rainbow_road",
        },
    )
    assert resp.status_code == 404


def test_ranked_race_completion_updates_vr_and_snapshot(seeded_client, db_session):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "ranked"}
    ).json()
    assert session["vr_account_id"] is not None

    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    )
    assert draft.status_code == 201
    race = draft.json()["race"]
    assert race["status"] == "draft"

    completed = seeded_client.patch(
        f"/api/v1/race-records/{race['id']}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 48},
    )
    assert completed.status_code == 200
    body = completed.json()
    assert body["status"] == "completed"
    assert body["placement"] == 1
    assert body["rating_before"] == 0
    assert body["rating_after"] == 48
    assert body["rating_delta"] == 48

    account = db_session.scalars(
        select(VrAccount).where(VrAccount.id == uuid.UUID(session["vr_account_id"]))
    ).one()
    assert account.current_vr == 48

    snapshots = db_session.scalars(
        select(RatingSnapshot).where(
            RatingSnapshot.race_record_id == uuid.UUID(race["id"])
        )
    ).all()
    assert len(snapshots) == 1
    assert snapshots[0].value == 48
    assert snapshots[0].delta == 48


def test_lounge_repick_warning(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()

    first = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    )
    assert first.status_code == 201
    assert first.json()["warnings"] == []
    assert first.json()["race"]["status"] == "draft"

    # Complete first race before drafting second (lounge stays draft now)
    seeded_client.patch(
        f"/api/v1/race-records/{first.json()['race']['id']}/complete-lounge",
        json={"placement": 1, "score": 15},
    )

    second = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    )
    assert second.status_code == 201
    assert "repick" in second.json()["warnings"]
    assert second.json()["race"]["status"] == "draft"


def test_lounge_12p_banned_route_warning(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 12}
    ).json()

    resp = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"route_id": "rt_peach_to_rainbow"},
    )
    assert resp.status_code == 201
    assert "route_banned_12p" in resp.json()["warnings"]
    assert resp.json()["race"]["status"] == "draft"


def test_lounge_session_auto_finishes_after_race_12(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()

    for n in range(1, 13):
        draft_resp = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        )
        assert draft_resp.status_code == 201
        assert draft_resp.json()["race"]["race_no"] == n
        race_id = draft_resp.json()["race"]["id"]
        seeded_client.patch(
            f"/api/v1/race-records/{race_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        )

    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"
    assert detail["completed_at"] is not None


def test_draft_requires_exactly_one_target(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    both = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass", "route_id": "rt_dk_pass_3lap"},
    )
    assert both.status_code == 422
    neither = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft", json={}
    )
    assert neither.status_code == 422


def test_undo_last_race_reverts_ranked_vr(seeded_client, db_session):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "ranked"}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 48},
    )

    undo = seeded_client.post(f"/api/v1/play-sessions/{session['id']}/undo-last-race")
    assert undo.status_code == 200
    assert undo.json()["status"] == "cancelled"

    account = db_session.scalars(
        select(VrAccount).where(VrAccount.id == uuid.UUID(session["vr_account_id"]))
    ).one()
    assert account.current_vr == 0
    assert db_session.scalars(select(RatingSnapshot)).all() == []


def test_active_sessions_listing(seeded_client):
    s1 = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    )
    seeded_client.post(f"/api/v1/play-sessions/{s1['id']}/finish")

    active = seeded_client.get("/api/v1/play-sessions/active").json()
    assert len(active) == 1
    assert active[0]["source"] == "lounge"


def test_course_search(seeded_client):
    resp = seeded_client.get("/api/v1/course-search", params={"q": "DK"})
    assert resp.status_code == 200
    body = resp.json()
    course_ids = {c["id"] for c in body["courses"]}
    assert "dk_pass" in course_ids


def _record_lounge_races(seeded_client, session_id, count):
    for _ in range(count):
        resp = seeded_client.post(
            f"/api/v1/play-sessions/{session_id}/races/draft",
            json={"course_id": "dk_pass"},
        )
        assert resp.status_code == 201


def test_session_race_list_in_race_order(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    _record_lounge_races(seeded_client, session["id"], 3)

    resp = seeded_client.get(f"/api/v1/play-sessions/{session['id']}/races")
    assert resp.status_code == 200
    assert [r["race_no"] for r in resp.json()] == [1, 2, 3]


def test_session_race_list_excludes_cancelled_by_default(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    _record_lounge_races(seeded_client, session["id"], 2)
    seeded_client.post(f"/api/v1/play-sessions/{session['id']}/undo-last-race")

    body = seeded_client.get(f"/api/v1/play-sessions/{session['id']}/races").json()
    assert len(body) == 1
    assert all(r["status"] != "cancelled" for r in body)


def test_session_race_list_include_cancelled(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    _record_lounge_races(seeded_client, session["id"], 2)
    seeded_client.post(f"/api/v1/play-sessions/{session['id']}/undo-last-race")

    body = seeded_client.get(
        f"/api/v1/play-sessions/{session['id']}/races",
        params={"include_cancelled": "true"},
    ).json()
    assert len(body) == 2
    assert any(r["status"] == "cancelled" for r in body)


def test_session_race_list_unknown_session_404(client):
    resp = client.get(f"/api/v1/play-sessions/{uuid.uuid4()}/races")
    assert resp.status_code == 404


def test_list_sessions_newest_first(seeded_client):
    seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"})
    seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    )

    resp = seeded_client.get("/api/v1/play-sessions")
    assert resp.status_code == 200
    times = [s["started_at"] for s in resp.json()]
    # Each entry must be >= the next (newest first)
    for i in range(len(times) - 1):
        assert times[i] >= times[i + 1]


def test_list_sessions_status_filter(seeded_client):
    s1 = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    )
    seeded_client.post(f"/api/v1/play-sessions/{s1['id']}/finish")

    resp = seeded_client.get("/api/v1/play-sessions", params={"status": "completed"})
    assert resp.status_code == 200
    sessions = resp.json()
    assert all(s["status"] == "completed" for s in sessions)
    assert any(s["id"] == s1["id"] for s in sessions)


def test_list_sessions_source_filter(seeded_client):
    seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"})
    seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    )

    resp = seeded_client.get("/api/v1/play-sessions", params={"source": "ranked"})
    assert resp.status_code == 200
    sessions = resp.json()
    assert all(s["source"] == "ranked" for s in sessions)


def test_list_sessions_limit(seeded_client):
    for _ in range(3):
        seeded_client.post(
            "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
        )

    resp = seeded_client.get("/api/v1/play-sessions", params={"limit": 2})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------

def test_create_course_note(seeded_client):
    resp = seeded_client.post("/api/v1/notes", json={"course_id": "dk_pass", "title": "DKテスト"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["course_id"] == "dk_pass"
    assert body["title"] == "DKテスト"
    assert body["is_active"] is True
    assert body["is_pinned"] is False


def test_create_route_note(seeded_client):
    resp = seeded_client.post(
        "/api/v1/notes",
        json={"route_id": "rt_peach_to_rainbow", "body_markdown": "ルートノート"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["route_id"] == "rt_peach_to_rainbow"
    assert body["body_markdown"] == "ルートノート"


def test_create_note_both_targets_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/notes",
        json={"course_id": "dk_pass", "route_id": "rt_peach_to_rainbow"},
    )
    assert resp.status_code == 422


def test_create_note_no_target_rejected(seeded_client):
    resp = seeded_client.post("/api/v1/notes", json={"title": "タイトルのみ"})
    assert resp.status_code == 422


def test_create_note_unknown_course_rejected(seeded_client):
    resp = seeded_client.post("/api/v1/notes", json={"course_id": "no_such_course"})
    assert resp.status_code == 404


def test_create_note_unknown_route_rejected(seeded_client):
    resp = seeded_client.post("/api/v1/notes", json={"route_id": "no_such_route"})
    assert resp.status_code == 404


def test_list_notes_filter_by_course_id(seeded_client):
    seeded_client.post("/api/v1/notes", json={"course_id": "dk_pass", "title": "DK"})
    seeded_client.post("/api/v1/notes", json={"route_id": "rt_peach_to_rainbow", "title": "ルート"})

    resp = seeded_client.get("/api/v1/notes", params={"course_id": "dk_pass"})
    assert resp.status_code == 200
    notes = resp.json()
    assert len(notes) >= 1
    assert all(n["course_id"] == "dk_pass" for n in notes)


def test_list_notes_filter_by_route_id(seeded_client):
    seeded_client.post("/api/v1/notes", json={"course_id": "dk_pass", "title": "DK"})
    seeded_client.post("/api/v1/notes", json={"route_id": "rt_peach_to_rainbow", "title": "ルート"})

    resp = seeded_client.get("/api/v1/notes", params={"route_id": "rt_peach_to_rainbow"})
    assert resp.status_code == 200
    notes = resp.json()
    assert len(notes) >= 1
    assert all(n["route_id"] == "rt_peach_to_rainbow" for n in notes)


def test_list_notes_both_filters_rejected(seeded_client):
    resp = seeded_client.get(
        "/api/v1/notes",
        params={"course_id": "dk_pass", "route_id": "rt_peach_to_rainbow"},
    )
    assert resp.status_code == 400


def test_list_notes_pinned_priority_order(seeded_client):
    seeded_client.post("/api/v1/notes", json={"course_id": "dk_pass", "title": "低", "priority": 0})
    seeded_client.post("/api/v1/notes", json={"course_id": "dk_pass", "title": "高", "priority": 10})
    seeded_client.post(
        "/api/v1/notes",
        json={"course_id": "dk_pass", "title": "ピン", "priority": 0, "is_pinned": True},
    )

    resp = seeded_client.get("/api/v1/notes", params={"course_id": "dk_pass"})
    notes = resp.json()
    assert notes[0]["is_pinned"] is True
    assert notes[1]["priority"] == 10


def test_patch_note(seeded_client):
    created = seeded_client.post(
        "/api/v1/notes", json={"course_id": "dk_pass", "title": "元タイトル"}
    ).json()

    resp = seeded_client.patch(
        f"/api/v1/notes/{created['id']}",
        json={"title": "新タイトル", "is_pinned": True},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "新タイトル"
    assert body["is_pinned"] is True


def test_delete_note_soft_deletes(seeded_client):
    created = seeded_client.post(
        "/api/v1/notes", json={"course_id": "dk_pass", "title": "削除対象"}
    ).json()

    resp = seeded_client.delete(f"/api/v1/notes/{created['id']}")
    assert resp.status_code == 204

    active = seeded_client.get("/api/v1/notes").json()
    assert all(n["id"] != created["id"] for n in active)


def test_include_inactive_shows_deleted(seeded_client):
    created = seeded_client.post(
        "/api/v1/notes", json={"course_id": "dk_pass", "title": "削除対象"}
    ).json()
    seeded_client.delete(f"/api/v1/notes/{created['id']}")

    resp = seeded_client.get("/api/v1/notes", params={"include_inactive": "true"})
    assert resp.status_code == 200
    ids = [n["id"] for n in resp.json()]
    assert created["id"] in ids


# ---------------------------------------------------------------------------
# Map Annotations
# ---------------------------------------------------------------------------

def test_create_course_annotation(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "label": "DKポイント", "x": 0.5, "y": 0.3},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["course_id"] == "dk_pass"
    assert body["label"] == "DKポイント"
    assert body["x"] == 0.5
    assert body["y"] == 0.3
    assert body["type"] == "pin"
    assert body["priority"] == 0


def test_create_route_annotation(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": "rt_peach_to_rainbow", "type": "text", "label": "ルートメモ"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["route_id"] == "rt_peach_to_rainbow"
    assert body["type"] == "text"


def test_create_annotation_both_targets_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "route_id": "rt_peach_to_rainbow"},
    )
    assert resp.status_code == 422


def test_create_annotation_no_target_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"label": "タイトルのみ"},
    )
    assert resp.status_code == 422


def test_create_annotation_unknown_course_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "no_such_course"},
    )
    assert resp.status_code == 404


def test_create_annotation_unknown_route_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": "no_such_route"},
    )
    assert resp.status_code == 404


def test_create_annotation_xy_out_of_range_rejected(seeded_client):
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "x": 1.5, "y": 0.5},
    )
    assert resp.status_code == 422


def test_create_annotation_linked_to_matching_note(seeded_client):
    note = seeded_client.post(
        "/api/v1/notes", json={"course_id": "dk_pass", "title": "参照ノート"}
    ).json()
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "note_id": note["id"], "label": "ノートリンク"},
    )
    assert resp.status_code == 201
    assert resp.json()["note_id"] == note["id"]


def test_create_annotation_mismatched_note_rejected(seeded_client):
    note = seeded_client.post(
        "/api/v1/notes", json={"course_id": "dk_pass", "title": "DKノート"}
    ).json()
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": "rt_peach_to_rainbow", "note_id": note["id"]},
    )
    assert resp.status_code == 400


def test_list_annotations_filter_by_course_id(seeded_client):
    seeded_client.post("/api/v1/map-annotations", json={"course_id": "dk_pass", "label": "DK"})
    seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": "rt_peach_to_rainbow", "label": "ルート"},
    )

    resp = seeded_client.get("/api/v1/map-annotations", params={"course_id": "dk_pass"})
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(a["course_id"] == "dk_pass" for a in items)


def test_list_annotations_filter_by_route_id(seeded_client):
    seeded_client.post("/api/v1/map-annotations", json={"course_id": "dk_pass", "label": "DK"})
    seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": "rt_peach_to_rainbow", "label": "ルート"},
    )

    resp = seeded_client.get(
        "/api/v1/map-annotations", params={"route_id": "rt_peach_to_rainbow"}
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(a["route_id"] == "rt_peach_to_rainbow" for a in items)


def test_patch_annotation(seeded_client):
    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "label": "元ラベル", "priority": 0},
    ).json()

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"label": "新ラベル", "type": "icon", "priority": 5},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["label"] == "新ラベル"
    assert body["type"] == "icon"
    assert body["priority"] == 5


def test_delete_annotation(seeded_client):
    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "label": "削除対象"},
    ).json()

    resp = seeded_client.delete(f"/api/v1/map-annotations/{created['id']}")
    assert resp.status_code == 204

    all_annotations = seeded_client.get("/api/v1/map-annotations").json()
    assert all(a["id"] != created["id"] for a in all_annotations)


def test_deleted_annotation_patch_returns_404(seeded_client):
    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": "dk_pass", "label": "削除後更新"},
    ).json()
    seeded_client.delete(f"/api/v1/map-annotations/{created['id']}")

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"label": "new"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Date range filter tests
# ---------------------------------------------------------------------------

def _dt(year: int, month: int, day: int, hour: int = 0) -> datetime:
    return datetime(year, month, day, hour, 0, 0, tzinfo=timezone.utc)


def _insert_session(
    db_session,
    started_at: datetime,
    source: SourceType = SourceType.lounge,
    status: SessionStatus = SessionStatus.completed,
) -> PlaySession:
    s = PlaySession(source=source, status=status, started_at=started_at)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def test_date_filter_started_from(client, db_session):
    old = _insert_session(db_session, _dt(2025, 1, 1))
    new = _insert_session(db_session, _dt(2026, 6, 1))

    resp = client.get("/api/v1/play-sessions", params={"started_from": "2026-01-01T00:00:00Z"})
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert str(new.id) in ids
    assert str(old.id) not in ids


def test_date_filter_started_to(client, db_session):
    old = _insert_session(db_session, _dt(2025, 1, 1))
    new = _insert_session(db_session, _dt(2026, 6, 1))

    resp = client.get("/api/v1/play-sessions", params={"started_to": "2026-01-01T00:00:00Z"})
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert str(old.id) in ids
    assert str(new.id) not in ids


def test_date_filter_range_inclusive_lower_exclusive_upper(client, db_session):
    s1 = _insert_session(db_session, _dt(2025, 1, 1))   # at lower bound — included
    s2 = _insert_session(db_session, _dt(2025, 6, 15))  # inside range — included
    s3 = _insert_session(db_session, _dt(2026, 1, 1))   # at upper bound — excluded

    resp = client.get(
        "/api/v1/play-sessions",
        params={"started_from": "2025-01-01T00:00:00Z", "started_to": "2026-01-01T00:00:00Z"},
    )
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert str(s1.id) in ids
    assert str(s2.id) in ids
    assert str(s3.id) not in ids


def test_date_filter_composes_with_source(client, db_session):
    lounge = _insert_session(db_session, _dt(2026, 3, 1), source=SourceType.lounge)
    ranked = _insert_session(db_session, _dt(2026, 3, 1), source=SourceType.ranked)

    resp = client.get(
        "/api/v1/play-sessions",
        params={"started_from": "2026-01-01T00:00:00Z", "source": "lounge"},
    )
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert str(lounge.id) in ids
    assert str(ranked.id) not in ids


def test_date_filter_composes_with_status(client, db_session):
    completed = _insert_session(db_session, _dt(2026, 3, 1), status=SessionStatus.completed)
    active = _insert_session(db_session, _dt(2026, 3, 2), status=SessionStatus.active)

    resp = client.get(
        "/api/v1/play-sessions",
        params={"started_from": "2026-01-01T00:00:00Z", "status": "completed"},
    )
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert str(completed.id) in ids
    assert str(active.id) not in ids


def test_date_filter_composes_with_limit(client, db_session):
    for day in range(1, 6):
        _insert_session(db_session, _dt(2026, 3, day))

    resp = client.get(
        "/api/v1/play-sessions",
        params={"started_from": "2026-01-01T00:00:00Z", "limit": 2},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_date_filter_default_newest_first(client, db_session):
    for day in [5, 1, 3]:
        _insert_session(db_session, _dt(2026, 3, day))

    resp = client.get(
        "/api/v1/play-sessions",
        params={"started_from": "2026-01-01T00:00:00Z"},
    )
    assert resp.status_code == 200
    times = [s["started_at"] for s in resp.json()]
    for i in range(len(times) - 1):
        assert times[i] >= times[i + 1]


# ---------------------------------------------------------------------------
# Result model redesign
# ---------------------------------------------------------------------------

def test_complete_lounge_records_placement_score(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    assert draft["race"]["status"] == "draft"

    resp = seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-lounge",
        json={"placement": 4, "score": 9},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "completed"
    assert body["placement"] == 4
    assert body["score"] == 9


def test_complete_lounge_validates_placement_against_player_count(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 12}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    resp = seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-lounge",
        json={"placement": 13, "score": 0},
    )
    assert resp.status_code == 400


def test_ranked_complete_validates_placement_range(seeded_client):
    session = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    resp = seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 13, "rating_after": 5000},
    )
    assert resp.status_code == 400


def test_hide_race_excludes_from_default_list(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{race_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )

    resp = seeded_client.post(f"/api/v1/race-records/{race_id}/hide")
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_hidden"] is True
    assert body["hidden_at"] is not None

    races = seeded_client.get(f"/api/v1/play-sessions/{session['id']}/races").json()
    assert all(r["id"] != race_id for r in races)


def test_include_hidden_shows_hidden_race(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{race_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/race-records/{race_id}/hide")

    races = seeded_client.get(
        f"/api/v1/play-sessions/{session['id']}/races",
        params={"include_hidden": "true"},
    ).json()
    assert any(r["id"] == race_id for r in races)


def test_hide_then_restore_returns_visible(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{race_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/race-records/{race_id}/hide")

    resp = seeded_client.post(f"/api/v1/race-records/{race_id}/restore")
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_hidden"] is False
    assert body["hidden_at"] is None


def test_restore_already_visible_is_idempotent(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]

    resp = seeded_client.post(f"/api/v1/race-records/{race_id}/restore")
    assert resp.status_code == 200
    assert resp.json()["is_hidden"] is False


def test_restore_race_appears_in_default_list(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{race_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/race-records/{race_id}/hide")

    # Hidden — excluded from default list
    default = seeded_client.get(f"/api/v1/play-sessions/{session['id']}/races").json()
    assert all(r["id"] != race_id for r in default)

    seeded_client.post(f"/api/v1/race-records/{race_id}/restore")

    # Restored — appears in default list again
    default2 = seeded_client.get(f"/api/v1/play-sessions/{session['id']}/races").json()
    assert any(r["id"] == race_id for r in default2)


def test_restore_race_unknown_404(client):
    resp = client.post(f"/api/v1/race-records/{uuid.uuid4()}/restore")
    assert resp.status_code == 404


def test_restore_lounge_race_syncs_session_status(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    last_race_id = None
    for _ in range(12):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        completed = seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        ).json()
        last_race_id = completed["id"]

    # Session auto-finished at 12 completed races
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "completed"

    # Hide the 12th race — session should reopen
    seeded_client.post(f"/api/v1/race-records/{last_race_id}/hide")
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "active"

    # Restore it — session should complete again
    seeded_client.post(f"/api/v1/race-records/{last_race_id}/restore")
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "completed"


def test_manual_finish_lounge_session_stays_completed_after_hide(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft_id = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{draft_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    finish_resp = seeded_client.post(f"/api/v1/play-sessions/{session['id']}/finish")
    assert finish_resp.json()["completion_reason"] == "manual"

    seeded_client.post(f"/api/v1/race-records/{draft_id}/hide")
    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"
    assert detail["completion_reason"] == "manual"


def test_manual_finish_lounge_session_stays_completed_after_restore(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    draft_id = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{draft_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/play-sessions/{session['id']}/finish")
    seeded_client.post(f"/api/v1/race-records/{draft_id}/hide")

    seeded_client.post(f"/api/v1/race-records/{draft_id}/restore")
    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"
    assert detail["completion_reason"] == "manual"


def test_auto_finished_lounge_session_has_completion_reason_auto(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    for _ in range(12):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        )
    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"
    assert detail["completion_reason"] == "auto"


def test_hide_race_reopens_auto_finished_session_and_clears_reason(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    last_race_id = None
    for _ in range(12):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        last_race_id = seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        ).json()["id"]

    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["completion_reason"] == "auto"

    seeded_client.post(f"/api/v1/race-records/{last_race_id}/hide")
    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "active"
    assert detail["completion_reason"] is None


def test_restore_race_re_auto_finishes_session_with_reason_auto(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    last_race_id = None
    for _ in range(12):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        last_race_id = seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        ).json()["id"]

    seeded_client.post(f"/api/v1/race-records/{last_race_id}/hide")
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "active"

    seeded_client.post(f"/api/v1/race-records/{last_race_id}/restore")
    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"
    assert detail["completion_reason"] == "auto"


def test_update_race_rating_after_recalculates_delta(seeded_client):
    session = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    race_id = draft["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{race_id}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 48},
    )

    resp = seeded_client.patch(
        f"/api/v1/race-records/{race_id}",
        json={"rating_after": 60},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["rating_after"] == 60
    assert body["rating_delta"] == 60  # 60 - 0 (rating_before)


def test_lounge_hidden_race_does_not_count_toward_auto_finish(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()

    # Record and hide 1 race, then complete 12 more — auto-finish should use the 12 completed+visible
    first_draft = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{first_draft}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/race-records/{first_draft}/hide")

    # Session is still active after hiding
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "active"

    # Complete 12 more races — session should auto-finish
    for _ in range(12):
        d = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        seeded_client.patch(
            f"/api/v1/race-records/{d}/complete-lounge",
            json={"placement": 1, "score": 15},
        )

    detail = seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()
    assert detail["status"] == "completed"


def test_hiding_twelfth_lounge_race_reopens_session(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    last_race_id = None

    for _ in range(12):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        completed = seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        ).json()
        last_race_id = completed["id"]

    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "completed"
    seeded_client.post(f"/api/v1/race-records/{last_race_id}/hide")
    assert seeded_client.get(f"/api/v1/play-sessions/{session['id']}").json()["status"] == "active"


# ---------------------------------------------------------------------------
# Map point coordinate update
# ---------------------------------------------------------------------------

def test_map_point_patch_updates_coordinates(seeded_client):
    resp = seeded_client.patch(
        "/api/v1/map-points/mp_dk_pass",
        json={"x": 0.25, "y": 0.75},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "mp_dk_pass"
    assert body["x"] == 0.25
    assert body["y"] == 0.75


def test_map_point_patch_unknown_returns_404(seeded_client):
    resp = seeded_client.patch(
        "/api/v1/map-points/no_such_point",
        json={"x": 0.5},
    )
    assert resp.status_code == 404


def test_map_point_patch_out_of_bounds_rejected(seeded_client):
    resp = seeded_client.patch(
        "/api/v1/map-points/mp_dk_pass",
        json={"x": 1.5},
    )
    assert resp.status_code == 422


def test_hidden_lounge_race_does_not_trigger_repick_warning(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    first_draft_id = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()["race"]["id"]
    seeded_client.patch(
        f"/api/v1/race-records/{first_draft_id}/complete-lounge",
        json={"placement": 1, "score": 15},
    )
    seeded_client.post(f"/api/v1/race-records/{first_draft_id}/hide")

    second = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    )
    assert second.status_code == 201
    assert "repick" not in second.json()["warnings"]


# ---------------------------------------------------------------------------
# Settings: lounge_season / lounge_game
# ---------------------------------------------------------------------------

def test_settings_read_includes_lounge_season_game(client):
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["lounge_season"] == 2
    assert body["lounge_game"] == "mkworld24p"


def test_settings_patch_lounge_season_game(client):
    resp = client.patch("/api/v1/settings", json={"lounge_season": 1, "lounge_game": "mkworld"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["lounge_season"] == 1
    assert body["lounge_game"] == "mkworld"


# ---------------------------------------------------------------------------
# Lounge MMR sync
# ---------------------------------------------------------------------------

def _mmr_change(change_id: int, new_mmr: int, delta: int, hours_ago: float = 0.5) -> dict:
    t = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return {
        "changeId": change_id,
        "newMmr": new_mmr,
        "mmrDelta": delta,
        "time": t.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "score": 40,
        "rank": 6,
        "tier": "SQ",
        "numPlayers": 12,
    }


def _mmr_change_alias(change_id: int, new_mmr: int, delta: int, hours_ago: float = 0.5) -> dict:
    """Like _mmr_change but uses tableId/mmr/delta/verifiedOn field aliases."""
    t = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return {
        "tableId": change_id,
        "mmr": new_mmr,
        "delta": delta,
        "verifiedOn": t.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }


def _player_details(mmr: int = 1000, changes: list | None = None) -> dict:
    return {"playerId": 1, "name": "Test", "mkcId": 1, "mmr": mmr, "mmrChanges": changes or []}


def _completed_lounge_session(
    db_session, completed_at: datetime, player_count: int = 12
) -> PlaySession:
    s = PlaySession(
        source=SourceType.lounge,
        status=SessionStatus.completed,
        started_at=completed_at - timedelta(hours=1),
        completed_at=completed_at,
        player_count=player_count,
    )
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def test_lounge_game_for_player_count_12p_season2():
    assert lounge_mmr.lounge_game_for_player_count(12, 2) == "mkworld12p"


def test_lounge_game_for_player_count_24p_season2():
    assert lounge_mmr.lounge_game_for_player_count(24, 2) == "mkworld24p"


def test_lounge_game_for_player_count_24p_season1():
    assert lounge_mmr.lounge_game_for_player_count(24, 1) == "mkworld"


def test_lounge_game_for_player_count_12p_season1():
    assert lounge_mmr.lounge_game_for_player_count(12, 1) == "mkworld"


def test_lounge_game_for_player_count_none_returns_none():
    assert lounge_mmr.lounge_game_for_player_count(None, 2) is None


def test_lounge_game_for_player_count_unsupported_returns_none():
    assert lounge_mmr.lounge_game_for_player_count(8, 2) is None


def test_mmr_sync_12p_session_matches_mkworld_stream(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details_12p = _player_details(1100, [_mmr_change(5001, 1100, 100, hours_ago=0.5)])
    details_24p = _player_details(2000, [])

    call_games = []

    def fake_fetch(player_id, season, game):
        call_games.append(game)
        return details_12p if game == "mkworld12p" else details_24p

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is not None
    assert body["updated_game"] == "mkworld12p"
    assert body["updated_session"]["lounge_mmr_game"] == "mkworld12p"
    assert "mkworld12p" in call_games
    assert "mkworld24p" in call_games


def test_mmr_sync_24p_session_matches_mkworld24p_stream(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=24)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details_12p = _player_details(1100, [])
    details_24p = _player_details(2000, [_mmr_change(6001, 2000, 50, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else details_24p

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is not None
    assert body["updated_game"] == "mkworld24p"
    assert body["updated_session"]["lounge_mmr_game"] == "mkworld24p"
    assert body["current_mmr_24p"] == 2000
    assert body["current_mmr_12p"] == 1100


def test_mmr_sync_mkworld24p_change_does_not_match_12p_session(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    # Only a 12p session exists; 24p change should not match it
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details_12p = _player_details(1100, [])
    details_24p = _player_details(2000, [_mmr_change(7001, 2000, 50, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else details_24p

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is None


def test_mmr_sync_season1_fetches_only_mkworld(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=24)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345", "lounge_season": 1})
    details = _player_details(800, [_mmr_change(8001, 800, 30, hours_ago=0.5)])

    call_games = []

    def fake_fetch(player_id, season, game):
        call_games.append(game)
        return details

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    # Season 1 fetches only mkworld
    assert call_games == ["mkworld"]
    body = resp.json()
    # 24p session is a valid match for mkworld in season 1
    assert body["updated_session"] is not None
    assert body["updated_game"] == "mkworld"


def test_mmr_fetch_player_details_sends_browser_user_agent():
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps(_player_details()).encode()

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["accept"] = req.get_header("Accept")
        captured["user_agent"] = req.get_header("User-agent")
        captured["timeout"] = timeout
        return FakeResponse()

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        details = lounge_mmr._fetch_player_details("12345", 2, "mkworld24p")

    assert details["mmr"] == 1000
    assert "mkcId=12345" in captured["url"]
    assert captured["accept"] == "application/json"
    assert captured["user_agent"] == "Mozilla/5.0"
    assert captured["timeout"] == lounge_mmr.REQUEST_TIMEOUT


def test_mmr_sync_requires_player_id(client):
    resp = client.post("/api/v1/lounge/mmr-sync")
    assert resp.status_code == 400


def test_mmr_sync_no_matching_session(seeded_client):
    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details = _player_details(1000, [_mmr_change(1001, 1000, 50)])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["current_mmr_12p"] == 1000
    assert body["updated_session"] is None
    assert body["updated_game"] is None


def test_mmr_sync_persists_current_mmr_to_settings(seeded_client):
    """Current MMR must persist to settings so it survives navigation / zero sessions."""
    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})

    def fake_fetch(player_id, season, game):
        # Distinct MMR per stream so we can confirm 12p/24p are not conflated.
        return _player_details(1000 if game == "mkworld12p" else 2000, [])

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        sync = seeded_client.post("/api/v1/lounge/mmr-sync")
    assert sync.status_code == 200
    assert sync.json()["current_mmr_12p"] == 1000
    assert sync.json()["current_mmr_24p"] == 2000

    # Re-read settings (simulating navigation away and back) — values persist.
    settings = seeded_client.get("/api/v1/settings").json()
    assert settings["lounge_mmr_12p"] == 1000
    assert settings["lounge_mmr_24p"] == 2000
    assert settings["lounge_mmr_synced_at"] is not None


def test_mmr_sync_updates_matching_session(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    session = _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details = _player_details(1100, [_mmr_change(2001, 1100, 100, hours_ago=0.5)])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["current_mmr_12p"] == 1100
    assert body["updated_session"] is not None
    assert body["updated_game"] == "mkworld12p"
    s = body["updated_session"]
    assert s["lounge_mmr_after"] == 1100
    assert s["lounge_mmr_delta"] == 100
    assert s["lounge_mmr_before"] == 1000
    assert s["lounge_mmr_table_id"] == "2001"
    assert s["lounge_mmr_synced_at"] is not None
    assert s["lounge_mmr_game"] == "mkworld12p"


def test_mmr_sync_idempotent(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "TestPlayer"})
    details = _player_details(900, [_mmr_change(3001, 900, 50, hours_ago=0.5)])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp1 = seeded_client.post("/api/v1/lounge/mmr-sync")
        resp2 = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp1.status_code == 200
    assert resp1.json()["updated_session"] is not None
    assert resp2.status_code == 200
    assert resp2.json()["updated_session"] is None


def test_mmr_sync_active_session_not_modified(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    active = PlaySession(
        source=SourceType.lounge,
        status=SessionStatus.active,
        started_at=now - timedelta(minutes=30),
    )
    db_session.add(active)
    db_session.commit()

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details = _player_details(800, [_mmr_change(4001, 800, 30, hours_ago=0.5)])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    assert resp.json()["updated_session"] is None
    db_session.refresh(active)
    assert active.lounge_mmr_table_id is None


def test_mmr_sync_no_changes_returns_null(seeded_client):
    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details = _player_details(500, [])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is None
    assert body["current_mmr_12p"] == 500


def test_mmr_sync_api_error_returns_502(seeded_client):
    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})

    with patch(
        "app.services.lounge_mmr._fetch_player_details",
        side_effect=RuntimeError("MKCentral unreachable: [Errno -2] Name or service not known"),
    ):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 502


def test_mmr_sync_non_json_response_returns_502(seeded_client):
    """Non-JSON body from MKCentral (e.g. HTML maintenance page) must return 502, not 500."""
    import urllib.error

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})

    class FakeHtmlResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return b"<html><body>Service Unavailable</body></html>"

    with patch("urllib.request.urlopen", return_value=FakeHtmlResponse()):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 502


def test_session_read_includes_mmr_fields(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    s = _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)
    s.lounge_mmr_after = 2000
    s.lounge_mmr_before = 1950
    s.lounge_mmr_delta = 50
    s.lounge_mmr_table_id = "9999"
    s.lounge_mmr_synced_at = now
    s.lounge_mmr_game = "mkworld"
    db_session.commit()

    resp = seeded_client.get(f"/api/v1/play-sessions/{s.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["lounge_mmr_after"] == 2000
    assert body["lounge_mmr_before"] == 1950
    assert body["lounge_mmr_delta"] == 50
    assert body["lounge_mmr_table_id"] == "9999"
    assert body["lounge_mmr_game"] == "mkworld"


# ---------------------------------------------------------------------------
# Lounge MMR response compatibility (field alias / malformed entry tolerance)
# ---------------------------------------------------------------------------

def test_mmr_sync_alias_fields_sync_successfully(seeded_client, db_session):
    """tableId/mmr/delta/verifiedOn aliases should sync identically to canonical fields."""
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    change = _mmr_change_alias(9001, 1200, 150, hours_ago=0.5)
    details = _player_details(1200, [change])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is not None
    s = body["updated_session"]
    assert s["lounge_mmr_after"] == 1200
    assert s["lounge_mmr_delta"] == 150
    assert s["lounge_mmr_before"] == 1050
    assert s["lounge_mmr_table_id"] == "9001"


def test_mmr_sync_missing_all_id_fields_skipped(seeded_client, db_session):
    """A change entry with no changeId/tableId/id is skipped; returns 200 with no updated session."""
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    t = (datetime.now(timezone.utc) - timedelta(hours=0.5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    change = {"newMmr": 1000, "mmrDelta": 50, "time": t}
    details = _player_details(1000, [change])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is None
    assert "利用できる" in body["message"]


def test_mmr_sync_malformed_change_then_valid_syncs_valid(seeded_client, db_session):
    """A malformed change entry before a valid one must not prevent syncing the valid entry."""
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    t = (datetime.now(timezone.utc) - timedelta(hours=0.5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    bad_change = {"newMmr": 1100, "mmrDelta": 100, "time": t}  # no id field
    good_change = _mmr_change(9101, 1100, 100, hours_ago=0.5)
    details = _player_details(1100, [bad_change, good_change])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is not None
    assert body["updated_session"]["lounge_mmr_table_id"] == "9101"


def test_mmr_sync_idempotent_with_alias_fields(seeded_client, db_session):
    """Second sync with alias-field change should find already-synced tableId and return no update."""
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    change = _mmr_change_alias(9201, 900, 40, hours_ago=0.5)
    details = _player_details(900, [change])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp1 = seeded_client.post("/api/v1/lounge/mmr-sync")
        resp2 = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp1.status_code == 200
    assert resp1.json()["updated_session"] is not None
    assert resp2.status_code == 200
    assert resp2.json()["updated_session"] is None


def test_mmr_sync_current_mmr_populated_when_changes_unusable(seeded_client):
    """Top-level mmr must populate current_mmr_12p even when every change entry is skipped."""
    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    t = (datetime.now(timezone.utc) - timedelta(hours=0.5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    bad_change = {"newMmr": 1500, "mmrDelta": 100, "time": t}  # no id field
    details = _player_details(1500, [bad_change])

    with patch("app.services.lounge_mmr._fetch_player_details", return_value=details):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["current_mmr_12p"] == 1500
    assert body["current_mmr_24p"] == 1500
    assert body["updated_session"] is None


# ---------------------------------------------------------------------------
# Lounge season snapshot / filter / sync tagging
# ---------------------------------------------------------------------------

def test_new_lounge_session_defaults_to_season_two(seeded_client):
    s = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    assert s["lounge_season"] == 2


def test_new_lounge_session_defaults_to_season_two_without_settings_row(client):
    s = client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    assert s["lounge_season"] == 2


def test_new_lounge_session_snapshots_current_season(seeded_client):
    seeded_client.patch(
        "/api/v1/settings", json={"lounge_season": 1, "lounge_game": "mkworld"}
    )
    s = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    assert s["lounge_season"] == 1


def test_changing_settings_does_not_mutate_session_season(seeded_client):
    s = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    assert s["lounge_season"] == 2

    seeded_client.patch("/api/v1/settings", json={"lounge_season": 5})

    again = seeded_client.get(f"/api/v1/play-sessions/{s['id']}").json()
    assert again["lounge_season"] == 2


def test_ranked_session_has_null_lounge_season(seeded_client):
    s = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    assert s["lounge_season"] is None


def test_list_sessions_lounge_season_filters_before_limit(client, db_session):
    # Newer season-1 sessions would dominate a small limit; the season filter must be
    # applied before the limit so the older season-2 rows are still returned.
    for day in range(1, 6):
        s = _insert_session(db_session, _dt(2026, 5, day))
        s.lounge_season = 1
    for day in range(1, 4):
        s = _insert_session(db_session, _dt(2026, 1, day))
        s.lounge_season = 2
    db_session.commit()

    resp = client.get("/api/v1/play-sessions", params={"lounge_season": 2, "limit": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    assert all(s["lounge_season"] == 2 for s in body)


def test_list_sessions_lounge_season_omitted_preserves_results(client, db_session):
    a = _insert_session(db_session, _dt(2026, 5, 1))
    a.lounge_season = 1
    b = _insert_session(db_session, _dt(2026, 5, 2))
    b.lounge_season = 2
    db_session.commit()

    resp = client.get("/api/v1/play-sessions")
    ids = {s["id"] for s in resp.json()}
    assert str(a.id) in ids
    assert str(b.id) in ids


def test_mmr_sync_tags_matched_session_with_requested_season(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details_12p = _player_details(1100, [_mmr_change(2501, 1100, 100, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else _player_details(2000, [])

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_session"] is not None
    assert body["updated_session"]["lounge_season"] == 2


def test_mmr_sync_does_not_match_session_tagged_different_season(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    s = _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)
    s.lounge_season = 1  # tagged season 1; requested season (default) is 2
    db_session.commit()

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})
    details_12p = _player_details(1100, [_mmr_change(2601, 1100, 100, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else _player_details(2000, [])

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    assert resp.json()["updated_session"] is None
    db_session.refresh(s)
    assert s.lounge_mmr_table_id is None
    assert s.lounge_season == 1


def test_mmr_sync_enriches_legacy_null_season_session(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    s = _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)
    # Legacy synced row: change is already attached but the season is unknown.
    s.lounge_mmr_table_id = "7777"
    s.lounge_mmr_after = 1100
    s.lounge_mmr_before = 1000
    s.lounge_mmr_delta = 100
    s.lounge_mmr_game = "mkworld12p"
    s.lounge_season = None
    db_session.commit()

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})  # season 2
    details_12p = _player_details(1100, [_mmr_change(7777, 1100, 100, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else _player_details(2000, [])

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    # Only legacy metadata was enriched — not a new session update.
    assert resp.json()["updated_session"] is None
    db_session.refresh(s)
    assert s.lounge_season == 2


def test_mmr_sync_does_not_overwrite_existing_season_on_enrichment(seeded_client, db_session):
    now = datetime.now(timezone.utc)
    s = _completed_lounge_session(db_session, completed_at=now - timedelta(minutes=30), player_count=12)
    s.lounge_mmr_table_id = "8888"
    s.lounge_mmr_after = 1100
    s.lounge_season = 1  # already a known, different season
    db_session.commit()

    seeded_client.patch("/api/v1/settings", json={"lounge_player_id": "12345"})  # season 2
    details_12p = _player_details(1100, [_mmr_change(8888, 1100, 100, hours_ago=0.5)])

    def fake_fetch(player_id, season, game):
        return details_12p if game == "mkworld12p" else _player_details(2000, [])

    with patch("app.services.lounge_mmr._fetch_player_details", side_effect=fake_fetch):
        resp = seeded_client.post("/api/v1/lounge/mmr-sync")

    assert resp.status_code == 200
    db_session.refresh(s)
    assert s.lounge_season == 1


# ---------------------------------------------------------------------------
# Session delete
# ---------------------------------------------------------------------------

def test_delete_session_unknown_returns_404(client):
    resp = client.delete(f"/api/v1/play-sessions/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_delete_session_removes_session_and_races(seeded_client, db_session):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()
    session_id = session["id"]

    for _ in range(3):
        draft_id = seeded_client.post(
            f"/api/v1/play-sessions/{session_id}/races/draft",
            json={"course_id": "dk_pass"},
        ).json()["race"]["id"]
        seeded_client.patch(
            f"/api/v1/race-records/{draft_id}/complete-lounge",
            json={"placement": 1, "score": 15},
        )

    resp = seeded_client.delete(f"/api/v1/play-sessions/{session_id}")
    assert resp.status_code == 204

    assert seeded_client.get(f"/api/v1/play-sessions/{session_id}").status_code == 404
    races = db_session.scalars(
        select(RaceRecord).where(RaceRecord.session_id == uuid.UUID(session_id))
    ).all()
    assert races == []


def test_delete_ranked_session_removes_rating_snapshots(seeded_client, db_session):
    session = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    session_id = session["id"]

    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session_id}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 48},
    )

    assert db_session.scalars(select(RatingSnapshot)).all() != []

    resp = seeded_client.delete(f"/api/v1/play-sessions/{session_id}")
    assert resp.status_code == 204

    assert db_session.scalars(select(RatingSnapshot)).all() == []


def test_delete_latest_ranked_session_rewinds_vr(seeded_client, db_session):
    session = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    session_id = session["id"]
    account_id = uuid.UUID(session["vr_account_id"])

    draft = seeded_client.post(
        f"/api/v1/play-sessions/{session_id}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    seeded_client.patch(
        f"/api/v1/race-records/{draft['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 100},
    )

    account = db_session.scalars(
        select(VrAccount).where(VrAccount.id == account_id)
    ).one()
    assert account.current_vr == 100

    resp = seeded_client.delete(f"/api/v1/play-sessions/{session_id}")
    assert resp.status_code == 204

    db_session.refresh(account)
    assert account.current_vr == 0


def test_delete_older_ranked_session_does_not_corrupt_current_vr(seeded_client, db_session):
    # Two ranked sessions: older then newer.
    session1 = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    account_id = uuid.UUID(session1["vr_account_id"])

    draft1 = seeded_client.post(
        f"/api/v1/play-sessions/{session1['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    seeded_client.patch(
        f"/api/v1/race-records/{draft1['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 3, "rating_after": 50},
    )

    session2 = seeded_client.post("/api/v1/play-sessions", json={"source": "ranked"}).json()
    draft2 = seeded_client.post(
        f"/api/v1/play-sessions/{session2['id']}/races/draft",
        json={"course_id": "dk_pass"},
    ).json()
    seeded_client.patch(
        f"/api/v1/race-records/{draft2['race']['id']}/complete-ranked",
        json={"player_count": 12, "placement": 1, "rating_after": 80},
    )

    account = db_session.scalars(
        select(VrAccount).where(VrAccount.id == account_id)
    ).one()
    assert account.current_vr == 80

    # Deleting older session must NOT rewind VR (newer race already moved it past 50)
    resp = seeded_client.delete(f"/api/v1/play-sessions/{session1['id']}")
    assert resp.status_code == 204

    db_session.refresh(account)
    assert account.current_vr == 80


# ---------------------------------------------------------------------------
# Map annotations — is_goal_image discriminator
# ---------------------------------------------------------------------------

def test_map_annotation_default_is_goal_image_false(seeded_client):
    """Creating a course annotation without is_goal_image defaults to False."""
    resp = seeded_client.get("/api/v1/courses")
    assert resp.status_code == 200
    course_id = resp.json()[0]["id"]

    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": course_id, "label": "test-course-ann"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_goal_image"] is False


def test_map_annotation_route_mid_and_goal(seeded_client):
    """Can create separate mid and goal annotations for the same route, and they are
    returned with the correct is_goal_image value."""
    resp = seeded_client.get("/api/v1/routes")
    assert resp.status_code == 200
    routes = resp.json()
    # Find a non-3-lap route (from_course_id != to_course_id) for a meaningful test.
    normal = next((r for r in routes if r["from_course_id"] != r["to_course_id"]), None)
    if normal is None:
        # All routes are 3-lap; just use first one but only test goal
        normal = routes[0]
    route_id = normal["id"]

    # Mid annotation
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": route_id, "label": "mid-ann", "is_goal_image": False},
    )
    assert resp.status_code == 201
    assert resp.json()["is_goal_image"] is False

    # Goal annotation
    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": route_id, "label": "goal-ann", "is_goal_image": True},
    )
    assert resp.status_code == 201
    assert resp.json()["is_goal_image"] is True

    # Both appear when listing by route_id
    resp = seeded_client.get(f"/api/v1/map-annotations?route_id={route_id}")
    assert resp.status_code == 200
    labels = {a["label"] for a in resp.json()}
    assert "mid-ann" in labels
    assert "goal-ann" in labels


def test_map_annotation_is_goal_image_requires_route_id(seeded_client):
    """is_goal_image=True without route_id must be rejected (422)."""
    resp = seeded_client.get("/api/v1/courses")
    course_id = resp.json()[0]["id"]

    resp = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": course_id, "is_goal_image": True, "label": "bad"},
    )
    assert resp.status_code == 422


def test_patch_annotation_is_goal_image_mid_to_goal(seeded_client):
    """Route annotation can be PATCHed from is_goal_image=False to True."""
    route_id = seeded_client.get("/api/v1/routes").json()[0]["id"]

    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": route_id, "label": "switch-test", "is_goal_image": False},
    ).json()
    assert created["is_goal_image"] is False

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"is_goal_image": True},
    )
    assert resp.status_code == 200
    assert resp.json()["is_goal_image"] is True


def test_patch_annotation_is_goal_image_goal_to_mid(seeded_client):
    """Route annotation can be PATCHed from is_goal_image=True to False."""
    route_id = seeded_client.get("/api/v1/routes").json()[0]["id"]

    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": route_id, "label": "switch-back-test", "is_goal_image": True},
    ).json()
    assert created["is_goal_image"] is True

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"is_goal_image": False},
    )
    assert resp.status_code == 200
    assert resp.json()["is_goal_image"] is False


def test_patch_course_annotation_is_goal_image_true_rejected(seeded_client):
    """Course annotation cannot be PATCHed to is_goal_image=True (422)."""
    course_id = seeded_client.get("/api/v1/courses").json()[0]["id"]

    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"course_id": course_id, "label": "course-ann"},
    ).json()
    assert created["is_goal_image"] is False

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"is_goal_image": True},
    )
    assert resp.status_code == 422


def test_patch_annotation_without_is_goal_image_preserves_value(seeded_client):
    """PATCHing other fields without is_goal_image keeps the existing is_goal_image value."""
    route_id = seeded_client.get("/api/v1/routes").json()[0]["id"]

    created = seeded_client.post(
        "/api/v1/map-annotations",
        json={"route_id": route_id, "label": "preserve-test", "is_goal_image": True},
    ).json()
    assert created["is_goal_image"] is True

    resp = seeded_client.patch(
        f"/api/v1/map-annotations/{created['id']}",
        json={"label": "updated-label"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["label"] == "updated-label"
    assert body["is_goal_image"] is True


# ---------------------------------------------------------------------------
# Time Attack
# ---------------------------------------------------------------------------
from app.models import TimeAttackRecord  # noqa: E402


def test_ta_empty_get_returns_empty_list(seeded_client):
    resp = seeded_client.get("/api/v1/time-attack-records")
    assert resp.status_code == 200
    assert resp.json() == []


def test_ta_create_by_put_returns_200_with_values(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["course_id"] == "mario_bros_circuit"
    assert body["category"] == "nita"
    assert body["personal_best_ms"] == 102350


def test_ta_repeat_put_updates_not_duplicates(seeded_client):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 99000},
    )
    resp = seeded_client.get("/api/v1/time-attack-records")
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) == 1
    assert records[0]["personal_best_ms"] == 99000


def test_ta_get_without_filter_returns_ordered_by_sort_order_then_category(seeded_client):
    # mario_bros_circuit (sort_order=10), crown_city (sort_order=20)
    seeded_client.put(
        "/api/v1/time-attack-records/crown_city/item",
        json={"personal_best_ms": 120000},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/item",
        json={"personal_best_ms": 105000},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/crown_city/nita",
        json={"personal_best_ms": 115000},
    )
    resp = seeded_client.get("/api/v1/time-attack-records")
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) == 4
    # Order: mario_bros_circuit/item, mario_bros_circuit/nita, crown_city/item, crown_city/nita
    assert records[0]["course_id"] == "mario_bros_circuit"
    assert records[0]["category"] == "item"
    assert records[1]["course_id"] == "mario_bros_circuit"
    assert records[1]["category"] == "nita"
    assert records[2]["course_id"] == "crown_city"
    assert records[2]["category"] == "item"
    assert records[3]["course_id"] == "crown_city"
    assert records[3]["category"] == "nita"


def test_ta_get_with_category_nita_filters_to_nita_only(seeded_client):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/item",
        json={"personal_best_ms": 105000},
    )
    resp = seeded_client.get("/api/v1/time-attack-records", params={"category": "nita"})
    assert resp.status_code == 200
    records = resp.json()
    assert all(r["category"] == "nita" for r in records)
    assert len(records) == 1


def test_ta_get_with_category_item_filters_to_item_only(seeded_client):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/item",
        json={"personal_best_ms": 105000},
    )
    resp = seeded_client.get("/api/v1/time-attack-records", params={"category": "item"})
    assert resp.status_code == 200
    records = resp.json()
    assert all(r["category"] == "item" for r in records)
    assert len(records) == 1


def test_ta_get_invalid_category_returns_422(seeded_client):
    resp = seeded_client.get("/api/v1/time-attack-records", params={"category": "bogus"})
    assert resp.status_code == 422


def test_ta_put_unknown_course_returns_404(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/no_such_course/nita",
        json={"personal_best_ms": 102350},
    )
    assert resp.status_code == 404


def test_ta_put_invalid_category_returns_422(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/bogus",
        json={"personal_best_ms": 102350},
    )
    assert resp.status_code == 422


def test_ta_each_time_field_saves_and_returns(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={
            "personal_best_ms": 102350,
            "world_record_ms": 95000,
            "target_time_ms": 100000,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["personal_best_ms"] == 102350
    assert body["world_record_ms"] == 95000
    assert body["target_time_ms"] == 100000


def test_ta_each_note_field_saves_and_returns(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={
            "personal_best_note": "my PB note",
            "world_record_note": "WR note",
            "target_note": "target note",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["personal_best_note"] == "my PB note"
    assert body["world_record_note"] == "WR note"
    assert body["target_note"] == "target note"


def test_ta_zero_time_value_returns_422(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 0},
    )
    assert resp.status_code == 422


def test_ta_negative_time_value_returns_422(seeded_client):
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": -1000},
    )
    assert resp.status_code == 422


def test_ta_explicit_null_clears_existing_value(seeded_client):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": None},
    )
    assert resp.status_code == 200
    assert resp.json()["personal_best_ms"] is None


def test_ta_omitted_field_preserves_existing_value(seeded_client):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350, "world_record_ms": 95000},
    )
    resp = seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"target_time_ms": 100000},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["personal_best_ms"] == 102350
    assert body["world_record_ms"] == 95000
    assert body["target_time_ms"] == 100000


def test_ta_db_contains_exactly_one_row_after_repeated_put(seeded_client, db_session):
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 102350},
    )
    seeded_client.put(
        "/api/v1/time-attack-records/mario_bros_circuit/nita",
        json={"personal_best_ms": 99000},
    )
    count = len(
        db_session.scalars(
            select(TimeAttackRecord).where(
                TimeAttackRecord.course_id == "mario_bros_circuit",
                TimeAttackRecord.category == "nita",
            )
        ).all()
    )
    assert count == 1
