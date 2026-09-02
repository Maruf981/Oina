from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.repositories import stock_movement as movement_repo
from app.schemas.stock_movement import StockMovementCreate, StockMovementOut

router = APIRouter(prefix="/stock-movements", tags=["stock-movements"])


@router.get("/", response_model=list[StockMovementOut])
def list_movements(
    product_variant_id: int | None = None,
    movement_type: str | None = None,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    return movement_repo.get_all(db, product_variant_id, movement_type)


@router.post("/incoming", response_model=StockMovementOut)
def create_incoming(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    return movement_repo.create_incoming(db, data)
