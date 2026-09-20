"""stock nonnegative check

Revision ID: dce94b623390
Revises: d591d79ba177
Create Date: 2026-09-20 10:37:06.757401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'dce94b623390'
down_revision: Union[str, None] = 'd591d79ba177'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint("ck_product_variants_stock_nonneg", "product_variants", "stock >= 0")


def downgrade() -> None:
    op.drop_constraint("ck_product_variants_stock_nonneg", "product_variants", type_="check")
