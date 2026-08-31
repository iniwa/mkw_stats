from app.core.database import get_db
from app.main import app


def test_readiness_reports_database_success(client):
    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "mkw-stats-backend",
        "database": "ok",
    }
    assert response.headers["cache-control"] == "no-store"


def test_readiness_sanitizes_database_failure(client):
    class FailingSession:
        def execute(self, statement):  # noqa: ARG002
            raise RuntimeError("postgresql://user:secret@example.test/mkw_stats")

    def failing_db():
        yield FailingSession()

    app.dependency_overrides[get_db] = failing_db
    response = client.get("/api/v1/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "error",
        "service": "mkw-stats-backend",
        "database": "error",
    }
    assert "secret" not in response.text


def test_version_uses_public_build_metadata_without_database(client, monkeypatch):
    def no_database_access():
        raise AssertionError("version must not access the database")
        yield

    app.dependency_overrides[get_db] = no_database_access
    monkeypatch.setenv("APP_COMMIT_SHA", "abc123")
    monkeypatch.setenv("APP_BUILD_TIMESTAMP", "2026-08-31T00:00:00Z")

    response = client.get("/api/v1/version")

    assert response.status_code == 200
    assert response.json() == {"commit": "abc123", "built_at": "2026-08-31T00:00:00Z"}
    assert response.headers["cache-control"] == "no-store"


def test_version_returns_null_for_missing_or_unknown_metadata(client, monkeypatch):
    monkeypatch.setenv("APP_COMMIT_SHA", " unknown ")
    monkeypatch.setenv("APP_BUILD_TIMESTAMP", " ")

    response = client.get("/api/v1/version")

    assert response.status_code == 200
    assert response.json() == {"commit": None, "built_at": None}
