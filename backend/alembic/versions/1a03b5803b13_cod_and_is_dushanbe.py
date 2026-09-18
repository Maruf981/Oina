"""cod and is_dushanbe

Revision ID: 1a03b5803b13
Revises: a7c3e91d2f40
Create Date: 2026-09-18 15:48:46.824159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1a03b5803b13'
down_revision: Union[str, None] = 'a7c3e91d2f40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    labels = [r[0] for r in conn.execute(sa.text("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'paymentmethod'"))]
    val = "COD" if "QR" in labels else "cod"
    with op.get_context().autocommit_block():
        op.execute(f"ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS '{val}'")
    op.add_column("orders", sa.Column("is_dushanbe", sa.Boolean(), nullable=False, server_default=sa.text("true")))


def downgrade() -> None:
    op.drop_column("orders", "is_dushanbe")
