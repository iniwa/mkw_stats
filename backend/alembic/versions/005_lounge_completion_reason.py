"""lounge completion reason

Revision ID: 005
Revises: 004
Create Date: 2026-05-25

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("play_sessions", sa.Column("completion_reason", sa.String(16), nullable=True))
    op.execute(
        "UPDATE play_sessions SET completion_reason = 'manual'"
        " WHERE status = 'completed' AND completed_at IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("play_sessions", "completion_reason")
