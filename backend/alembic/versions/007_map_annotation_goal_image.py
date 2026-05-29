"""map annotation goal image flag

Revision ID: 007
Revises: 006
Create Date: 2026-05-29

Add is_goal_image boolean to map_annotations so that route annotations can be
scoped to either the mid-route image (道中) or the final-lap image (道後).

Existing 3-lap route annotations (from_course_id == to_course_id) were always
rendered on the goal image, so they are back-filled to is_goal_image=true.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "map_annotations",
        sa.Column(
            "is_goal_image",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # Back-fill: 3-lap route annotations were always displayed on the goal image.
    op.execute(
        """
        UPDATE map_annotations
        SET is_goal_image = TRUE
        WHERE route_id IN (
            SELECT id FROM routes WHERE from_course_id = to_course_id
        )
        """
    )


def downgrade() -> None:
    op.drop_column("map_annotations", "is_goal_image")
