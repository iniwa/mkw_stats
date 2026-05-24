"""Pydantic request/response schemas for the v1 API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import PlacementBand, RaceStatus, SessionStatus, SourceType

_orm = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------
class SettingsRead(BaseModel):
    model_config = _orm

    id: int
    selected_vr_account_id: uuid.UUID | None
    selected_character_id: uuid.UUID | None
    selected_vehicle_id: uuid.UUID | None
    lounge_player_id: str | None
    lounge_auto_sync: bool


class SettingsUpdate(BaseModel):
    selected_vr_account_id: uuid.UUID | None = None
    selected_character_id: uuid.UUID | None = None
    selected_vehicle_id: uuid.UUID | None = None
    lounge_player_id: str | None = None
    lounge_auto_sync: bool | None = None


# --------------------------------------------------------------------------
# VR accounts
# --------------------------------------------------------------------------
class VrAccountRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    name: str
    display_name: str
    initial_vr: int
    current_vr: int
    is_active: bool
    sort_order: int


class VrAccountCreate(BaseModel):
    name: str
    display_name: str
    initial_vr: int = 0
    current_vr: int | None = None
    sort_order: int = 0


class VrAccountUpdate(BaseModel):
    display_name: str | None = None
    initial_vr: int | None = None
    current_vr: int | None = None
    sort_order: int | None = None


# --------------------------------------------------------------------------
# Courses / routes / map points
# --------------------------------------------------------------------------
class CourseRead(BaseModel):
    model_config = _orm

    id: str
    name_ja: str
    name_en: str | None
    short_name: str | None
    tags: list | dict | None
    sort_order: int
    is_active: bool


class RouteRead(BaseModel):
    model_config = _orm

    id: str
    from_course_id: str
    to_course_id: str
    name_ja: str | None
    name_en: str | None
    short_name: str | None
    is_lounge_12p_banned: bool
    repick_group_key: str | None
    tags: list | dict | None
    sort_order: int
    is_active: bool


class MapPointRead(BaseModel):
    model_config = _orm

    id: str
    course_id: str | None
    label_ja: str
    label_en: str | None
    x: float
    y: float
    radius: float | None


class CourseSearchResult(BaseModel):
    courses: list[CourseRead]
    routes: list[RouteRead]


class CourseSelectionResolveRequest(BaseModel):
    from_map_point_id: str
    to_map_point_id: str


class CourseSelectionResolveResponse(BaseModel):
    kind: Literal["course", "route"]
    course: CourseRead | None = None
    route: RouteRead | None = None
    display_name: str
    confirm_message: str


# --------------------------------------------------------------------------
# Play sessions
# --------------------------------------------------------------------------
class PlaySessionCreate(BaseModel):
    source: SourceType
    title: str | None = None
    vr_account_id: uuid.UUID | None = None
    player_count: int | None = None
    format: str | None = None


class PlaySessionRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    source: SourceType
    status: SessionStatus
    title: str | None
    vr_account_id: uuid.UUID | None
    lounge_table_id: uuid.UUID | None
    player_count: int | None
    format: str | None
    started_at: datetime
    completed_at: datetime | None


# --------------------------------------------------------------------------
# Race records
# --------------------------------------------------------------------------
class RaceRecordRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    session_id: uuid.UUID
    source: SourceType
    status: RaceStatus
    race_no: int | None
    course_id: str | None
    route_id: str | None
    player_count: int | None
    placement_band: PlacementBand | None
    vr_account_id: uuid.UUID | None
    rating_before: int | None
    rating_after: int | None
    rating_delta: int | None
    character_id: uuid.UUID | None
    vehicle_id: uuid.UUID | None
    memo: str | None
    warning_flags: list | None


class RaceResponse(BaseModel):
    """A race record plus the warnings computed for it."""

    race: RaceRecordRead
    warnings: list[str]


class RaceDraftRequest(BaseModel):
    course_id: str | None = None
    route_id: str | None = None
    player_count: int | None = None

    @model_validator(mode="after")
    def _exactly_one_target(self) -> RaceDraftRequest:
        if bool(self.course_id) == bool(self.route_id):
            raise ValueError("Exactly one of course_id or route_id is required")
        return self


class RaceCompleteRankedRequest(BaseModel):
    player_count: int
    placement_band: PlacementBand
    rating_delta: int
    rating_before: int | None = None
    rating_after: int | None = None
    character_id: uuid.UUID | None = None
    vehicle_id: uuid.UUID | None = None
    memo: str | None = None


class RaceUpdateRequest(BaseModel):
    player_count: int | None = None
    placement_band: PlacementBand | None = None
    character_id: uuid.UUID | None = None
    vehicle_id: uuid.UUID | None = None
    memo: str | None = None


# --------------------------------------------------------------------------
# Course notes
# --------------------------------------------------------------------------
class CourseNoteRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    course_id: str | None
    route_id: str | None
    title: str | None
    body_markdown: str | None
    priority: int
    tags: list | None
    is_pinned: bool
    is_active: bool
    created_at: datetime


class CourseNoteCreate(BaseModel):
    course_id: str | None = None
    route_id: str | None = None
    title: str | None = None
    body_markdown: str | None = None
    priority: int = 0
    tags: list | None = None
    is_pinned: bool = False

    @model_validator(mode="after")
    def _exactly_one_target(self) -> CourseNoteCreate:
        if bool(self.course_id) == bool(self.route_id):
            raise ValueError("course_id か route_id のどちらか一方が必要です")
        return self


class CourseNoteUpdate(BaseModel):
    title: str | None = None
    body_markdown: str | None = None
    priority: int | None = None
    tags: list | None = None
    is_pinned: bool | None = None
