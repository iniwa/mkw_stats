import uuid

from sqlalchemy import Enum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import PlacementBand


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_ja: Mapped[str] = mapped_column(String(64), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(64), nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    acceleration: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    handling: Mapped[float | None] = mapped_column(Float, nullable=True)
    traction: Mapped[float | None] = mapped_column(Float, nullable=True)
    mini_turbo: Mapped[float | None] = mapped_column(Float, nullable=True)
    invincibility: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    game_version: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_ja: Mapped[str] = mapped_column(String(64), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(64), nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    acceleration: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    handling: Mapped[float | None] = mapped_column(Float, nullable=True)
    traction: Mapped[float | None] = mapped_column(Float, nullable=True)
    mini_turbo: Mapped[float | None] = mapped_column(Float, nullable=True)
    invincibility: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    game_version: Mapped[str | None] = mapped_column(String(32), nullable=True)


class ItemTable(Base):
    __tablename__ = "item_tables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    player_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    placement_band: Mapped[PlacementBand | None] = mapped_column(Enum(PlacementBand, name="placement_band"), nullable=True)
    rank_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    item_name: Mapped[str] = mapped_column(String(64), nullable=False)
    probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    tendency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
