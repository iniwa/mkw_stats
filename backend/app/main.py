import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import api_router
from app.core.database import get_db

app = FastAPI(title="mkw-stats-backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "mkw-stats-backend"}


def _build_value(name: str) -> str | None:
    value = os.environ.get(name, "").strip()
    return value if value and value.lower() != "unknown" else None


@app.get("/api/v1/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "service": "mkw-stats-backend", "database": "error"},
            headers={"Cache-Control": "no-store"},
        )
    return JSONResponse(
        content={"status": "ok", "service": "mkw-stats-backend", "database": "ok"},
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/v1/version")
def version():
    return JSONResponse(
        content={
            "commit": _build_value("APP_COMMIT_SHA"),
            "built_at": _build_value("APP_BUILD_TIMESTAMP"),
        },
        headers={"Cache-Control": "no-store"},
    )


app.include_router(api_router)
