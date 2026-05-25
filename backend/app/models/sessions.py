import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import PlacementBand, RaceStatus, SessionStatus, SourceType


class PlaySession(Base):
    __tablename__ = "play_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[SourceType] = mapped_column(Enum(SourceType, name="source_type"), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus, name="session_status"), nullable=False, default=SessionStatus.active)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    vr_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vr_accounts.id"), nullable=True)
    lounge_table_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lounge_tables.id"), nullable=True)
    player_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str | None] = mapped_column(String(16), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RaceRecord(Base):
    __tablename__ = "race_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("play_sessions.id"), nullable=False)
    source: Mapped[SourceType] = mapped_column(Enum(SourceType, name="source_type"), nullable=False)
    status: Mapped[RaceStatus] = mapped_column(Enum(RaceStatus, name="race_status"), nullable=False, default=RaceStatus.draft)
    race_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    route_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("routes.id"), nullable=True)
    player_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    placement_band: Mapped[PlacementBand | None] = mapped_column(Enum(PlacementBand, name="placement_band"), nullable=True)
    vr_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vr_accounts.id"), nullable=True)
    rating_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating_delta: Mapped[int | None] = mapped_column(Integer, nullable=True)
    character_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    placement: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default='false')
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    warning_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_race_records_course_xor_route",
        ),
    )
