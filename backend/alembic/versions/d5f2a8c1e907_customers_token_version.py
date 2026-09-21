"""customers.token_version

Revision ID: d5f2a8c1e907
Revises: a7c1e5d9b203

Смена/сброс пароля и удаление аккаунта выключают все старые входы клиента.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5f2a8c1e907'
down_revision: Union[str, None] = 'a7c1e5d9b203'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('customers', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('customers', 'token_version')
