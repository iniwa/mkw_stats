"""API-level tests for the v1 backend slice (SQLite-backed — see conftest.py)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.models import PlaySession, RaceRecord, RatingSnapshot, VrAccount
from app.models.enums import RaceStatus, SessionStatus, SourceType


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


def test_course_selection_resolve_same_point_is_course(seeded_client):
    resp = seeded_client.post(
        "/api/v1/course-selection/resolve",
        json={"from_map_point_id": "mp_dk_pass", "to_map_point_id": "mp_dk_pass"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "course"
    assert body["course"]["id"] == "dk_pass"
    assert body["route"] is None
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
        json={"player_count": 12, "placement_band": "top", "rating_delta": 48},
    )
    assert completed.status_code == 200
    body = completed.json()
    assert body["status"] == "completed"
    assert body["rating_before"] == 0
    assert body["rating_after"] == 48

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
    assert first.json()["race"]["status"] == "completed"

    second = seeded_client.post(
        f"/api/v1/play-sessions/{session['id']}/races/draft",
        json={"course_id": "dk_pass"},
    )
    assert second.status_code == 201
    assert "repick" in second.json()["warnings"]
    # Warning must not block the record.
    assert second.json()["race"]["status"] == "completed"


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
    assert resp.json()["race"]["status"] == "completed"


def test_lounge_session_auto_finishes_after_race_12(seeded_client):
    session = seeded_client.post(
        "/api/v1/play-sessions", json={"source": "lounge", "player_count": 24}
    ).json()

    for n in range(1, 13):
        resp = seeded_client.post(
            f"/api/v1/play-sessions/{session['id']}/races/draft",
            json={"course_id": "dk_pass"},
        )
        assert resp.status_code == 201
        assert resp.json()["race"]["race_no"] == n

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
        json={"player_count": 12, "placement_band": "top", "rating_delta": 48},
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
