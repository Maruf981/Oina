from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.product import ProductVariant
from app.repositories.stock_movement import record_movement
from app.schemas.order import OrderCreate


def get_or_create_customer(db: Session, name: str, phone: str) -> Customer:
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer:
        return customer
    customer = Customer(name=name, phone=phone)
    db.add(customer)
    db.flush()
    return customer


def create_order(db: Session, data: OrderCreate) -> Order:
    customer = get_or_create_customer(db, data.customer_name, data.customer_phone)

    total = 0.0
    order_items = []

    for item in data.items:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.product_variant_id).first()
        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.product_variant_id} not found")
        if variant.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for variant {variant.id}")

        price = float(variant.product.price)
        total += price * item.quantity
        order_items.append((variant, item.quantity, price))

    order = Order(
        customer_id=customer.id,
        status=OrderStatus.AWAITING_PAYMENT,
        payment_method=PaymentMethod(data.payment_method),
        delivery_address=data.delivery_address,
        comment=data.comment,
        total=total,
    )
    db.add(order)
    db.flush()

    for variant, quantity, price in order_items:
        db.add(OrderItem(
            order_id=order.id,
            product_variant_id=variant.id,
            quantity=quantity,
            price_at_order=price,
        ))
        variant.stock -= quantity
        record_movement(
            db,
            variant_id=variant.id,
            movement_type="sale",
            quantity=-quantity,
            order_id=order.id,
        )

    db.commit()
    db.refresh(order)
    return order


def return_order_item(db: Session, order_id: int, item_id: int, quantity: int | None = None) -> OrderItem:
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    remaining = item.quantity - item.returned_quantity
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Item already fully returned")

    if quantity is None:
        quantity = remaining
    if quantity < 1 or quantity > remaining:
        raise HTTPException(status_code=400, detail=f"Некорректное количество для возврата (доступно: {remaining})")

    item.returned_quantity += quantity
    item.is_returned = item.returned_quantity >= item.quantity
    item.variant.stock += quantity
    record_movement(
        db,
        variant_id=item.product_variant_id,
        movement_type="return",
        quantity=quantity,
        order_id=order_id,
        note=f"Возврат — заказ №{order_id}, позиция №{item_id}, кол-во {quantity}",
    )
    db.commit()
    db.refresh(item)
    return item


def exchange_item_variant(db: Session, order_id: int, item_id: int, new_variant_id: int) -> OrderItem:
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    remaining = item.quantity - item.returned_quantity
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Эта позиция уже полностью возвращена — обменивать нечего")

    new_variant = db.query(ProductVariant).filter(ProductVariant.id == new_variant_id).first()
    if not new_variant:
        raise HTTPException(status_code=404, detail="Новый вариант товара не найден")

    if new_variant.stock < remaining:
        raise HTTPException(status_code=400, detail=f"Недостаточно остатка нового варианта (доступно: {new_variant.stock})")

    old_variant = item.variant

    old_variant.stock += remaining
    record_movement(
        db,
        variant_id=old_variant.id,
        movement_type="return",
        quantity=remaining,
        order_id=order_id,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: получен обратно старый вариант",
    )

    new_variant.stock -= remaining
    record_movement(
        db,
        variant_id=new_variant.id,
        movement_type="outgoing",
        quantity=-remaining,
        order_id=order_id,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: выдан новый вариант",
    )

    item.product_variant_id = new_variant_id
    item.price_at_order = float(new_variant.product.price)

    order = item.order
    order.total = sum(float(i.price_at_order) * i.quantity for i in order.items)

    db.commit()
    db.refresh(item)
    return item


def update_status(db: Session, order: Order, new_status: str) -> Order:
    old_status = order.status
    restore_statuses = {OrderStatus.CANCELLED, OrderStatus.RETURNED}
    already_restored = old_status in restore_statuses
    will_restore = OrderStatus(new_status) in restore_statuses

    order.status = OrderStatus(new_status)

    if new_status == "delivered" and not order.delivered_at:
        from datetime import datetime
        order.delivered_at = datetime.utcnow()

    if will_restore and not already_restored:
        for item in order.items:
            item.variant.stock += item.quantity
            record_movement(
                db,
                variant_id=item.product_variant_id,
                movement_type="return",
                quantity=item.quantity,
                order_id=order.id,
                note=f"Заказ №{order.id} — {new_status}",
            )

    db.commit()
    db.refresh(order)
    return order