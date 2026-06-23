"""Pydantic request/response schemas for the v1 API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import AnnotationType, RaceStatus, SessionStatus, SourceType, TimeAttackCategory

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
    lounge_season: int
    lounge_game: str
    lounge_mmr_12p: int | None
    lounge_mmr_24p: int | None
    lounge_mmr_synced_at: datetime | None


class SettingsUpdate(BaseModel):
    selected_vr_account_id: uuid.UUID | None = None
    selected_character_id: uuid.UUID | None = None
    selected_vehicle_id: uuid.UUID | None = None
    lounge_player_id: str | None = None
    lounge_auto_sync: bool | None = None
    lounge_season: int | None = None
    lounge_game: str | None = None


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


class MapPointUpdate(BaseModel):
    x: _normalized_float | None = None
    y: _normalized_float | None = None
    radius: _normalized_float | None = None


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
    lounge_mmr_before: int | None
    lounge_mmr_after: int | None
    lounge_mmr_delta: int | None
    lounge_mmr_table_id: str | None
    lounge_mmr_synced_at: datetime | None
    lounge_mmr_game: str | None
    lounge_season: int | None
    completion_reason: str | None


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
    placement: int | None
    score: int | None
    is_hidden: bool
    hidden_at: datetime | None
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
    player_count: int = Field(ge=1)
    placement: int = Field(ge=1)
    rating_after: int = Field(ge=0)
    rating_before: int | None = None
    character_id: uuid.UUID | None = None
    vehicle_id: uuid.UUID | None = None


class RaceCompleteLoungeRequest(BaseModel):
    placement: int = Field(ge=1)
    score: int = Field(ge=0)


class RaceUpdateRequest(BaseModel):
    memo: str | None = None
    player_count: int | None = Field(default=None, ge=1)
    placement: int | None = Field(default=None, ge=1)
    rating_after: int | None = Field(default=None, ge=0)
    score: int | None = Field(default=None, ge=0)


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


# --------------------------------------------------------------------------
# Map annotations
# --------------------------------------------------------------------------
_normalized_float = Annotated[float, Field(ge=0.0, le=1.0)]


class MapAnnotationRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    course_id: str | None
    route_id: str | None
    note_id: uuid.UUID | None
    type: AnnotationType
    icon_type: str | None
    x: float | None
    y: float | None
    width: float | None
    height: float | None
    rotation: float | None
    label: str | None
    hover_text: str | None
    priority: int
    style: dict | None
    is_goal_image: bool


class MapAnnotationCreate(BaseModel):
    course_id: str | None = None
    route_id: str | None = None
    note_id: uuid.UUID | None = None
    type: AnnotationType = AnnotationType.pin
    icon_type: str | None = None
    x: _normalized_float | None = None
    y: _normalized_float | None = None
    width: _normalized_float | None = None
    height: _normalized_float | None = None
    rotation: float | None = None
    label: str | None = None
    hover_text: str | None = None
    priority: int = 0
    style: dict | None = None
    # False = mid-route image (道中), True = goal/final-lap image (道後).
    # Ignored (treated as False) when course_id is set.
    is_goal_image: bool = False

    @model_validator(mode="after")
    def _exactly_one_target(self) -> MapAnnotationCreate:
        if bool(self.course_id) == bool(self.route_id):
            raise ValueError("course_id か route_id のどちらか一方が必要です")
        if self.is_goal_image and not self.route_id:
            raise ValueError("is_goal_image=True は route_id が必要です")
        return self


class MapAnnotationUpdate(BaseModel):
    note_id: uuid.UUID | None = None
    type: AnnotationType | None = None
    icon_type: str | None = None
    x: _normalized_float | None = None
    y: _normalized_float | None = None
    width: _normalized_float | None = None
    height: _normalized_float | None = None
    rotation: float | None = None
    label: str | None = None
    hover_text: str | None = None
    priority: int | None = None
    style: dict | None = None
    is_goal_image: bool | None = None


# --------------------------------------------------------------------------
# Time Attack
# --------------------------------------------------------------------------
class TimeAttackRecordRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    course_id: str
    category: TimeAttackCategory
    personal_best_ms: int | None
    world_record_ms: int | None
    target_time_ms: int | None
    personal_best_note: str | None
    world_record_note: str | None
    target_note: str | None
    created_at: datetime
    updated_at: datetime


class TimeAttackRecordUpdate(BaseModel):
    personal_best_ms: int | None = Field(default=None, gt=0)
    world_record_ms: int | None = Field(default=None, gt=0)
    target_time_ms: int | None = Field(default=None, gt=0)
    personal_best_note: str | None = None
    world_record_note: str | None = None
    target_note: str | None = None


# --------------------------------------------------------------------------
# Lounge MMR sync
# --------------------------------------------------------------------------
class MmrSyncResponse(BaseModel):
    current_mmr_12p: int | None
    current_mmr_24p: int | None
    updated_session: PlaySessionRead | None
    updated_game: str | None
    message: str
