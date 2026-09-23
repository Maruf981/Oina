"""add batch to products and order items

Revision ID: 5616b0b6d8e7
Revises: a96463f1a453
Create Date: 2026-09-23 14:33:28.989183

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5616b0b6d8e7'
down_revision: Union[str, None] = 'a96463f1a453'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("batch", sa.String(60), nullable=True))
    op.add_column("order_items", sa.Column("batch", sa.String(60), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "batch")
    op.drop_column("products", "batch")
