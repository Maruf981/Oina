from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_customer, get_current_admin
from app.models.customer import Customer
from app.repositories import order as order_repo
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/my", response_model=list[OrderOut])
def list_my_orders(current: Customer = Depends(get_current_customer), db: Session = Depends(get_db)):
    from app.models.order import Order
    return db.query(Order).filter(Order.customer_id == current.id).order_by(Order.created_at.desc()).all()


@router.post("/", response_model=OrderOut)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    return order_repo.create_order(db, data)


@router.get("/", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    from app.models.order import Order
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def change_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_repo.update_status(db, order, data.status)