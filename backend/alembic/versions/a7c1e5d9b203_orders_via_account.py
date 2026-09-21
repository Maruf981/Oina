"""orders.via_account

Revision ID: a7c1e5d9b203
Revises: c4d8e1f2a3b5

В «Мои заказы» показываются только заказы, оформленные из аккаунта.
Гостевые (QR) и телефонные заказы в аккаунт не попадают — их нельзя увидеть, зарегистрировавшись на чужой номер.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c1e5d9b203'
down_revision: Union[str, None] = 'c4d8e1f2a3b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('via_account', sa.Boolean(), nullable=False, server_default='false'))
    # старые заказы: карта и оплата при получении с сайта требовали входа — значит, из аккаунта
    op.execute(
        "UPDATE orders SET via_account = true "
        "WHERE source = 'site' AND upper(payment_method::text) IN ('CARD', 'COD')"
    )


def downgrade() -> None:
    op.drop_column('orders', 'via_account')
