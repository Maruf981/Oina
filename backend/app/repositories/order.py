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


def update_status(db: Session, order: Order, new_status: str) -> Order:
    old_status = order.status
    restore_statuses = {OrderStatus.CANCELLED, OrderStatus.RETURNED}
    already_restored = old_status in restore_statuses
    will_restore = OrderStatus(new_status) in restore_statuses

    order.status = OrderStatus(new_status)

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