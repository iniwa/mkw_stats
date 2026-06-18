"""time attack records

Revision ID: 008
Revises: 007
Create Date: 2026-06-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    time_attack_category = postgresql.ENUM("nita", "item", name="time_attack_category", create_type=False)
    op.execute("CREATE TYPE time_attack_category AS ENUM ('nita', 'item')")

    op.create_table(
        "time_attack_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", sa.String(64), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("category", time_attack_category, nullable=False),
        sa.Column("personal_best_ms", sa.Integer, nullable=True),
        sa.Column("world_record_ms", sa.Integer, nullable=True),
        sa.Column("target_time_ms", sa.Integer, nullable=True),
        sa.Column("personal_best_note", sa.Text, nullable=True),
        sa.Column("world_record_note", sa.Text, nullable=True),
        sa.Column("target_note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("course_id", "category", name="uq_ta_record_course_category"),
        sa.CheckConstraint("personal_best_ms IS NULL OR personal_best_ms > 0", name="chk_ta_personal_best_positive"),
        sa.CheckConstraint("world_record_ms IS NULL OR world_record_ms > 0", name="chk_ta_world_record_positive"),
        sa.CheckConstraint("target_time_ms IS NULL OR target_time_ms > 0", name="chk_ta_target_time_positive"),
    )
    # No separate course/category index: redundant with uq_ta_record_course_category.


def downgrade() -> None:
    op.drop_table("time_attack_records")
    op.execute("DROP TYPE time_attack_category")
