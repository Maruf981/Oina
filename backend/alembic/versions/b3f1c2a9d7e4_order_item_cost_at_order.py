"""order item cost_at_order

Revision ID: b3f1c2a9d7e4
Revises: d1e533109754
"""
from alembic import op
import sqlalchemy as sa

revision = "b3f1c2a9d7e4"
down_revision = "d1e533109754"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.models.product import Product, ProductVariant
    op.add_column("order_items", sa.Column("cost_at_order", sa.Numeric(10, 2), nullable=True))
    op.execute(f"""
        UPDATE order_items oi SET cost_at_order = p.cost_price
        FROM {ProductVariant.__tablename__} pv JOIN {Product.__tablename__} p ON p.id = pv.product_id
        WHERE pv.id = oi.product_variant_id AND oi.cost_at_order IS NULL
    """)


def downgrade() -> None:
    op.drop_column("order_items", "cost_at_order")
