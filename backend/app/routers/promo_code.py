from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_customer
from app.models.customer import Customer
from app.models.product import ProductVariant
from app.models.promo_code import PromoCode
from app.repositories.promo_code import count_uses, get_valid_promo
from app.schemas.promo_code import PromoCheckOut, PromoCheckRequest, PromoCodeCreate, PromoCodeOut, PromoCodeUpdate
from app.services.pricing import current_price, price_with_promo

router = APIRouter(prefix="/promo-codes", tags=["promo-codes"])


def _out(db: Session, promo: PromoCode) -> PromoCodeOut:
    out = PromoCodeOut.model_validate(promo)
    out.used_count = count_uses(db, promo.id)
    return out


def _check_dates(promo: PromoCode) -> None:
    if promo.starts_on and promo.ends_on and promo.ends_on < promo.starts_on:
        raise HTTPException(status_code=400, detail="Дата окончания раньше даты начала")


@router.post("/check", response_model=PromoCheckOut)
def check_promo(data: PromoCheckRequest, current: Customer = Depends(get_current_customer), db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Корзина пуста")
    lines = []
    for item in data.items:
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Некорректное количество")
        variant = db.get(ProductVariant, item.product_variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail="Товар не найден")
        lines.append((variant.product, item.quantity))

    subtotal = sum(current_price(p) * q for p, q in lines)
    promo = get_valid_promo(db, data.code, current.id, subtotal)
    total = sum(price_with_promo(p, promo.percent) * q for p, q in lines)
    return PromoCheckOut(code=promo.code, percent=promo.percent, subtotal=subtotal, discount=subtotal - total, total=total)


@router.get("/", response_model=list[PromoCodeOut])
def list_promos(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    promos = db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()
    return [_out(db, p) for p in promos]


@router.post("/", response_model=PromoCodeOut)
def create_promo(data: PromoCodeCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    if db.query(PromoCode).filter(PromoCode.code == data.code).first():
        raise HTTPException(status_code=400, detail="Такой код уже существует")
    promo = PromoCode(**data.model_dump())
    _check_dates(promo)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return _out(db, promo)


@router.patch("/{promo_id}", response_model=PromoCodeOut)
def update_promo(promo_id: int, data: PromoCodeUpdate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    promo = db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in ("percent", "per_customer_limit", "is_active"):
            continue
        setattr(promo, field, value)
    _check_dates(promo)
    db.commit()
    db.refresh(promo)
    return _out(db, promo)
