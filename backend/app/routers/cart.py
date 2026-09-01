from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import get_current_customer
from app.models.customer import Customer
from app.models.cart import CartItem
from app.models.product import ProductVariant
from app.schemas.cart import CartItemOut, CartItemCreate, CartItemUpdate

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/", response_model=list[CartItemOut])
def list_cart(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.variant).joinedload(ProductVariant.product))
        .filter(CartItem.customer_id == customer.id)
        .all()
    )


@router.post("/", response_model=CartItemOut)
def add_to_cart(
    data: CartItemCreate,
    db: Session = Depends(get_db),
    customer: Customer = Depends(get_current_customer),
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == data.product_variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    existing = (
        db.query(CartItem)
        .filter(CartItem.customer_id == customer.id, CartItem.product_variant_id == data.product_variant_id)
        .first()
    )
    if existing:
        existing.quantity += data.quantity
        db.commit()
        db.refresh(existing)
        return existing

    item = CartItem(customer_id=customer.id, product_variant_id=data.product_variant_id, quantity=data.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=CartItemOut)
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    customer: Customer = Depends(get_current_customer),
):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.customer_id == customer.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if data.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    item.quantity = data.quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    customer: Customer = Depends(get_current_customer),
):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.customer_id == customer.id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "removed"}


@router.delete("/")
def clear_cart(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    db.query(CartItem).filter(CartItem.customer_id == customer.id).delete()
    db.commit()
    return {"status": "cleared"}
