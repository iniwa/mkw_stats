"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    source_type = postgresql.ENUM("ranked", "lounge", name="source_type", create_type=False)
    race_status = postgresql.ENUM("draft", "completed", "cancelled", name="race_status", create_type=False)
    session_status = postgresql.ENUM("active", "completed", "cancelled", name="session_status", create_type=False)
    placement_band = postgresql.ENUM("top", "middle", "bottom", name="placement_band", create_type=False)
    annotation_type = postgresql.ENUM("pin", "icon", "arrow", "text", "area", name="annotation_type", create_type=False)

    op.execute("CREATE TYPE source_type AS ENUM ('ranked', 'lounge')")
    op.execute("CREATE TYPE race_status AS ENUM ('draft', 'completed', 'cancelled')")
    op.execute("CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled')")
    op.execute("CREATE TYPE placement_band AS ENUM ('top', 'middle', 'bottom')")
    op.execute("CREATE TYPE annotation_type AS ENUM ('pin', 'icon', 'arrow', 'text', 'area')")

    op.create_table(
        "vr_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("display_name", sa.String(128), nullable=False),
        sa.Column("initial_vr", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_vr", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_vr_accounts_single_active ON vr_accounts (is_active) WHERE is_active = true"
    )

    op.create_table(
        "characters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name_ja", sa.String(64), nullable=False),
        sa.Column("name_en", sa.String(64), nullable=True),
        sa.Column("speed", sa.Float, nullable=True),
        sa.Column("acceleration", sa.Float, nullable=True),
        sa.Column("weight", sa.Float, nullable=True),
        sa.Column("handling", sa.Float, nullable=True),
        sa.Column("traction", sa.Float, nullable=True),
        sa.Column("mini_turbo", sa.Float, nullable=True),
        sa.Column("invincibility", sa.Float, nullable=True),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("game_version", sa.String(32), nullable=True),
    )

    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name_ja", sa.String(64), nullable=False),
        sa.Column("name_en", sa.String(64), nullable=True),
        sa.Column("speed", sa.Float, nullable=True),
        sa.Column("acceleration", sa.Float, nullable=True),
        sa.Column("weight", sa.Float, nullable=True),
        sa.Column("handling", sa.Float, nullable=True),
        sa.Column("traction", sa.Float, nullable=True),
        sa.Column("mini_turbo", sa.Float, nullable=True),
        sa.Column("invincibility", sa.Float, nullable=True),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("game_version", sa.String(32), nullable=True),
    )

    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("selected_vr_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vr_accounts.id"), nullable=True),
        sa.Column("selected_character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("characters.id"), nullable=True),
        sa.Column("selected_vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("lounge_player_id", sa.String(64), nullable=True),
        sa.Column("lounge_auto_sync", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "courses",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name_ja", sa.String(128), nullable=False),
        sa.Column("name_en", sa.String(128), nullable=True),
        sa.Column("short_name", sa.String(32), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "map_points",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("label_ja", sa.String(128), nullable=False),
        sa.Column("label_en", sa.String(128), nullable=True),
        sa.Column("x", sa.Float, nullable=False),
        sa.Column("y", sa.Float, nullable=False),
        sa.Column("radius", sa.Float, nullable=True),
    )

    op.create_table(
        "routes",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("from_course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("to_course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("name_ja", sa.String(128), nullable=True),
        sa.Column("name_en", sa.String(128), nullable=True),
        sa.Column("short_name", sa.String(32), nullable=True),
        sa.Column("is_lounge_12p_banned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("repick_group_key", sa.String(64), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "route_repick_equivalents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=False),
        sa.Column("equivalent_course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("equivalent_route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column("note", sa.String(256), nullable=True),
        sa.CheckConstraint(
            "(equivalent_course_id IS NOT NULL AND equivalent_route_id IS NULL) OR (equivalent_course_id IS NULL AND equivalent_route_id IS NOT NULL)",
            name="chk_repick_equiv_course_xor_route",
        ),
    )

    op.create_table(
        "course_aliases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column("alias", sa.String(128), nullable=False),
        sa.Column("alias_type", sa.String(32), nullable=True),
        sa.CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_course_aliases_course_xor_route",
        ),
    )

    op.create_table(
        "course_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column("title", sa.String(256), nullable=True),
        sa.Column("body_markdown", sa.Text, nullable=True),
        sa.Column("priority", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("is_pinned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_course_notes_course_xor_route",
        ),
    )

    op.create_table(
        "map_annotations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column("note_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("course_notes.id"), nullable=True),
        sa.Column("type", annotation_type, nullable=False),
        sa.Column("icon_type", sa.String(64), nullable=True),
        sa.Column("x", sa.Float, nullable=True),
        sa.Column("y", sa.Float, nullable=True),
        sa.Column("width", sa.Float, nullable=True),
        sa.Column("height", sa.Float, nullable=True),
        sa.Column("rotation", sa.Float, nullable=True),
        sa.Column("label", sa.String(256), nullable=True),
        sa.Column("hover_text", sa.Text, nullable=True),
        sa.Column("priority", sa.Integer, nullable=False, server_default="0"),
        sa.Column("style", postgresql.JSONB, nullable=True),
        sa.CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_map_annotations_course_xor_route",
        ),
    )

    op.create_table(
        "uploaded_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("original_filename", sa.String(256), nullable=False),
        sa.Column("stored_path", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=True),
        sa.Column("size_bytes", sa.Integer, nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("checksum_sha256", sa.String(64), nullable=True),
    )

    op.create_table(
        "lounge_tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("season", sa.Integer, nullable=True),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("format", sa.String(16), nullable=True),
        sa.Column("player_count", sa.Integer, nullable=True),
        sa.Column("tier", sa.String(32), nullable=True),
        sa.Column("raw_data", postgresql.JSONB, nullable=True),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "lounge_table_players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lounge_table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lounge_tables.id"), nullable=False),
        sa.Column("lounge_player_id", sa.String(64), nullable=False),
        sa.Column("player_name", sa.String(128), nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("mmr_before", sa.Float, nullable=True),
        sa.Column("mmr_after", sa.Float, nullable=True),
        sa.Column("mmr_delta", sa.Float, nullable=True),
        sa.Column("raw_data", postgresql.JSONB, nullable=True),
    )

    op.create_table(
        "play_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", source_type, nullable=False),
        sa.Column("status", session_status, nullable=False, server_default="active"),
        sa.Column("title", sa.String(256), nullable=True),
        sa.Column("vr_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vr_accounts.id"), nullable=True),
        sa.Column("lounge_table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lounge_tables.id"), nullable=True),
        sa.Column("player_count", sa.Integer, nullable=True),
        sa.Column("format", sa.String(16), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "race_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("play_sessions.id"), nullable=False),
        sa.Column("source", source_type, nullable=False),
        sa.Column("status", race_status, nullable=False, server_default="draft"),
        sa.Column("race_no", sa.Integer, nullable=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("route_id", sa.String(64), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column("player_count", sa.Integer, nullable=True),
        sa.Column("placement_band", placement_band, nullable=True),
        sa.Column("vr_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vr_accounts.id"), nullable=True),
        sa.Column("rating_before", sa.Integer, nullable=True),
        sa.Column("rating_after", sa.Integer, nullable=True),
        sa.Column("rating_delta", sa.Integer, nullable=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("characters.id"), nullable=True),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("memo", sa.Text, nullable=True),
        sa.Column("warning_flags", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "(course_id IS NOT NULL AND route_id IS NULL) OR (course_id IS NULL AND route_id IS NOT NULL)",
            name="chk_race_records_course_xor_route",
        ),
    )

    op.create_table(
        "rating_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", source_type, nullable=False),
        sa.Column("vr_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vr_accounts.id"), nullable=True),
        sa.Column("lounge_player_id", sa.String(64), nullable=True),
        sa.Column("value", sa.Integer, nullable=False),
        sa.Column("delta", sa.Integer, nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("race_record_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("race_records.id"), nullable=True),
        sa.Column("lounge_table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lounge_tables.id"), nullable=True),
    )

    op.create_table(
        "item_tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("game_version", sa.String(32), nullable=True),
        sa.Column("mode", sa.String(32), nullable=True),
        sa.Column("player_count", sa.Integer, nullable=True),
        sa.Column("placement_band", placement_band, nullable=True),
        sa.Column("rank_from", sa.Integer, nullable=True),
        sa.Column("rank_to", sa.Integer, nullable=True),
        sa.Column("item_name", sa.String(64), nullable=False),
        sa.Column("probability", sa.Float, nullable=True),
        sa.Column("tendency", sa.String(64), nullable=True),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("item_tables")
    op.drop_table("rating_snapshots")
    op.drop_table("race_records")
    op.drop_table("play_sessions")
    op.drop_table("lounge_table_players")
    op.drop_table("lounge_tables")
    op.drop_table("uploaded_files")
    op.drop_table("map_annotations")
    op.drop_table("course_notes")
    op.drop_table("course_aliases")
    op.drop_table("route_repick_equivalents")
    op.drop_table("routes")
    op.drop_table("map_points")
    op.drop_table("courses")
    op.drop_table("app_settings")
    op.drop_table("vehicles")
    op.drop_table("characters")
    op.drop_table("vr_accounts")
    op.execute("DROP TYPE annotation_type")
    op.execute("DROP TYPE placement_band")
    op.execute("DROP TYPE session_status")
    op.execute("DROP TYPE race_status")
    op.execute("DROP TYPE source_type")
