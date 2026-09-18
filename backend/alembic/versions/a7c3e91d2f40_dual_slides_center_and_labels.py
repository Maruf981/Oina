"""dual_slides: center image + ball labels ru/tj"""
from alembic import op
import sqlalchemy as sa

revision = "a7c3e91d2f40"
down_revision = "b49587243f97"
branch_labels = None
depends_on = None

COLS = ["left_label_ru", "left_label_tj", "center_label_ru", "center_label_tj", "right_label_ru", "right_label_tj"]


def upgrade():
    op.add_column("dual_slides", sa.Column("center_image_url", sa.String(500), nullable=True))
    for c in COLS:
        op.add_column("dual_slides", sa.Column(c, sa.String(60), nullable=True))


def downgrade():
    for c in reversed(COLS):
        op.drop_column("dual_slides", c)
    op.drop_column("dual_slides", "center_image_url")
