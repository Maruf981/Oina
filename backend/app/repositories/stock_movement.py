from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.stock_movement import StockMovement
from app.models.product import ProductVariant


def get_variant_locked(db: Session, variant_id: int) -> ProductVariant | None:
    """Читает вариант товара с блокировкой строки (SELECT ... FOR UPDATE),
    чтобы защититься от гонки при одновременном изменении остатка."""
    return db.query(ProductVariant).filter(ProductVariant.id == variant_id).with_for_update().first()


def record_movement(
    db: Session,
    variant_id: int,
    movement_type: str,
    quantity: int,
    cost_price_at_time: float | None = None,
    order_id: int | None = None,
    supplier_id: int | None = None,
    note: str | None = None,
    idempotency_key: str | None = None,
) -> StockMovement:
    movement = StockMovement(
        product_variant_id=variant_id,
        movement_type=movement_type,
        quantity=quantity,
        cost_price_at_time=cost_price_at_time,
        order_id=order_id,
        supplier_id=supplier_id,
        note=note,
        idempotency_key=idempotency_key,
    )
    db.add(movement)
    return movement


def create_incoming(db: Session, data) -> StockMovement:
    idempotency_key = getattr(data, "idempotency_key", None)
    if idempotency_key:
        existing = db.query(StockMovement).filter(StockMovement.idempotency_key == idempotency_key).first()
        if existing:
            return existing

    variant = get_variant_locked(db, data.product_variant_id)
    if not variant:
        raise ValueError("Variant not found")
    movement = record_movement(
        db,
        variant_id=data.product_variant_id,
        movement_type="incoming",
        quantity=abs(data.quantity),
        cost_price_at_time=data.cost_price_at_time,
        supplier_id=data.supplier_id,
        note=data.note,
        idempotency_key=idempotency_key,
    )
    variant.stock += abs(data.quantity)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.query(StockMovement).filter(StockMovement.idempotency_key == idempotency_key).first()
            if existing:
                return existing
        raise
    db.refresh(movement)
    return movement


def create_outgoing(db: Session, data) -> StockMovement:
    idempotency_key = getattr(data, "idempotency_key", None)
    if idempotency_key:
        existing = db.query(StockMovement).filter(StockMovement.idempotency_key == idempotency_key).first()
        if existing:
            return existing

    variant = get_variant_locked(db, data.product_variant_id)
    if not variant:
        raise ValueError("Variant not found")
    qty = abs(data.quantity)
    if variant.stock < qty:
        raise ValueError(f"Недостаточно остатка (доступно: {variant.stock})")
    movement = record_movement(
        db,
        variant_id=data.product_variant_id,
        movement_type="writeoff",
        quantity=-qty,
        cost_price_at_time=variant.product.cost_price,
        note=data.note,
        idempotency_key=idempotency_key,
    )
    variant.stock -= qty
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.query(StockMovement).filter(StockMovement.idempotency_key == idempotency_key).first()
            if existing:
                return existing
        raise
    db.refresh(movement)
    return movement


def get_all(db: Session, product_variant_id: int | None = None, movement_type: str | None = None):
    query = db.query(StockMovement).order_by(StockMovement.created_at.desc())
    if product_variant_id is not None:
        query = query.filter(StockMovement.product_variant_id == product_variant_id)
    if movement_type is not None:
        query = query.filter(StockMovement.movement_type == movement_type)
    return query.all()
