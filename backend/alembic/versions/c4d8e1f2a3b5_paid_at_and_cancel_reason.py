"""paid_at and cancel_reason

Revision ID: c4d8e1f2a3b5
Revises: ad2b7c86a1e4
Create Date: 2026-09-20 18:00:00

Оплата отдельно от статуса (paid_at) + причина отмены (cancel_reason) вместо метки [fake] в комментарии.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d8e1f2a3b5'
down_revision: Union[str, None] = 'ad2b7c86a1e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('paid_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('cancel_reason', sa.String(length=30), nullable=True))

    conn = op.get_bind()
    labels = {r[0] for r in conn.execute(sa.text(
        "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'orderstatus'"))}

    def st(name: str) -> str:
        return name.upper() if name.upper() in labels else name.lower()

    # предоплата (QR/карта), которая уже прошла дальше "Ожидает оплаты" — деньги получены
    op.execute(
        "UPDATE orders SET paid_at = COALESCE(delivered_at, created_at) "
        "WHERE upper(payment_method::text) IN ('QR', 'CARD') "
        "AND upper(status::text) IN ('PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED')"
    )
    # оплата при получении: доставлен или вручную отмечен "Оплачен" — наличные получены
    op.execute(
        "UPDATE orders SET paid_at = COALESCE(delivered_at, created_at) "
        "WHERE upper(payment_method::text) = 'COD' AND upper(status::text) IN ('PAID', 'DELIVERED', 'RETURNED') "
        "AND paid_at IS NULL"
    )
    # статус "Оплачен" больше не используется: доставленные -> "Доставлен", остальные -> "Подтверждён"
    op.execute(f"UPDATE orders SET status = '{st('delivered')}' WHERE upper(status::text) = 'PAID' AND delivered_at IS NOT NULL")
    op.execute(f"UPDATE orders SET status = '{st('confirmed')}' WHERE upper(status::text) = 'PAID'")

    # старая метка [fake] в комментарии -> причина "Отказался без причины"
    op.execute(
        "UPDATE orders SET cancel_reason = 'refused', "
        "comment = NULLIF(btrim(substring(comment FROM 7)), '') "
        "WHERE comment LIKE '[fake]%'"
    )


def downgrade() -> None:
    op.execute("UPDATE orders SET comment = left('[fake] ' || COALESCE(comment, ''), 500) "
               "WHERE cancel_reason IN ('refused', 'no_answer', 'wrong_address')")
    op.drop_column('orders', 'cancel_reason')
    op.drop_column('orders', 'paid_at')
