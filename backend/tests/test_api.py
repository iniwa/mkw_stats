"""API-level tests for the v1 backend slice (SQLite-backed — see conftest.py)."""
import uuid

from sqlalchemy import select

from app.models import RaceRecord, RatingSnapshot, VrAccount
from app.models.enums import RaceStatus


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
