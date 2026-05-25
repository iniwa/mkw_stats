"""lounge mmr sync

Revision ID: 003
Revises: 002
Create Date: 2026-05-25

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("app_settings", sa.Column("lounge_season", sa.Integer, nullable=False, server_default="2"))
    op.add_column("app_settings", sa.Column("lounge_game", sa.String(64), nullable=False, server_default="mkworld24p"))
    op.add_column("play_sessions", sa.Column("lounge_mmr_before", sa.Integer, nullable=True))
    op.add_column("play_sessions", sa.Column("lounge_mmr_after", sa.Integer, nullable=True))
    op.add_column("play_sessions", sa.Column("lounge_mmr_delta", sa.Integer, nullable=True))
    op.add_column("play_sessions", sa.Column("lounge_mmr_table_id", sa.String(64), nullable=True))
    op.add_column("play_sessions", sa.Column("lounge_mmr_synced_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("play_sessions", "lounge_mmr_synced_at")
    op.drop_column("play_sessions", "lounge_mmr_table_id")
    op.drop_column("play_sessions", "lounge_mmr_delta")
    op.drop_column("play_sessions", "lounge_mmr_after")
    op.drop_column("play_sessions", "lounge_mmr_before")
    op.drop_column("app_settings", "lounge_game")
    op.drop_column("app_settings", "lounge_season")
