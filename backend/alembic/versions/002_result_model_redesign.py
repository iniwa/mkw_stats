"""result model redesign

Revision ID: 002
Revises: 001
Create Date: 2026-05-25

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("race_records", sa.Column("placement", sa.Integer, nullable=True))
    op.add_column("race_records", sa.Column("score", sa.Integer, nullable=True))
    op.add_column(
        "race_records",
        sa.Column("is_hidden", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "race_records",
        sa.Column("hidden_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("race_records", "hidden_at")
    op.drop_column("race_records", "is_hidden")
    op.drop_column("race_records", "score")
    op.drop_column("race_records", "placement")
