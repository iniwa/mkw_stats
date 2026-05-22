import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class LoungeTable(Base):
    __tablename__ = "lounge_tables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season: Mapped[int | None] = mapped_column(Integer, nullable=True)
    played_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    format: Mapped[str | None] = mapped_column(String(16), nullable=True)
    player_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tier: Mapped[str | None] = mapped_column(String(32), nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class LoungeTablePlayer(Base):
    __tablename__ = "lounge_table_players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lounge_table_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lounge_tables.id"), nullable=False)
    lounge_player_id: Mapped[str] = mapped_column(String(64), nullable=False)
    player_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mmr_before: Mapped[float | None] = mapped_column(Float, nullable=True)
    mmr_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    mmr_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
