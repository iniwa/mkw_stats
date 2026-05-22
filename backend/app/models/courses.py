import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, Enum, Float, ForeignKey, Integer, String, Text, func, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import AnnotationType


class MapPoint(Base):
    __tablename__ = "map_points"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    label_ja: Mapped[str] = mapped_column(String(128), nullable=False)
    label_en: Mapped[str | None] = mapped_column(String(128), nullable=True)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    radius: Mapped[float | None] = mapped_column(Float, nullable=True)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name_ja: Mapped[str] = mapped_column(String(128), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(128), nullable=True)
    short_name: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    from_course_id: Mapped[str] = mapped_column(String(64), ForeignKey("courses.id"), nullable=False)
    to_course_id: Mapped[str] = mapped_column(String(64), ForeignKey("courses.id"), nullable=False)
    name_ja: Mapped[str | None] = mapped_column(String(128), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(128), nullable=True)
    short_name: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_lounge_12p_banned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    repick_group_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class RouteRepickEquivalent(Base):
    __tablename__ = "route_repick_equivalents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id: Mapped[str] = mapped_column(String(64), ForeignKey("routes.id"), nullable=False)
    equivalent_course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    equivalent_route_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("routes.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(256), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(equivalent_course_id IS NOT NULL AND equivalent_route_id IS NULL) OR (equivalent_course_id IS NULL AND equivalent_route_id IS NOT NULL)",
            name="chk_repick_equiv_course_xor_route",
        ),
    )


class CourseAlias(Base):
    __tablename__ = "course_aliases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    route_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("routes.id"), nullable=True)
    alias: Mapped[str] = mapped_column(String(128), nullable=False)
    alias_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_course_aliases_course_xor_route",
        ),
    )


class CourseNote(Base):
    __tablename__ = "course_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    route_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("routes.id"), nullable=True)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    body_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_course_notes_course_xor_route",
        ),
    )


class MapAnnotation(Base):
    __tablename__ = "map_annotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("courses.id"), nullable=True)
    route_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("routes.id"), nullable=True)
    note_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("course_notes.id"), nullable=True)
    type: Mapped[AnnotationType] = mapped_column(Enum(AnnotationType, name="annotation_type"), nullable=False)
    icon_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    hover_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    style: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_map_annotations_course_xor_route",
        ),
    )
