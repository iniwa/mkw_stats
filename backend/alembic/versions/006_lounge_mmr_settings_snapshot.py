"""lounge mmr settings snapshot

Revision ID: 006
Revises: 005
Create Date: 2026-05-29

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("app_settings", sa.Column("lounge_mmr_12p", sa.Integer(), nullable=True))
    op.add_column("app_settings", sa.Column("lounge_mmr_24p", sa.Integer(), nullable=True))
    op.add_column(
        "app_settings",
        sa.Column("lounge_mmr_synced_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("app_settings", "lounge_mmr_synced_at")
    op.drop_column("app_settings", "lounge_mmr_24p")
    op.drop_column("app_settings", "lounge_mmr_12p")
