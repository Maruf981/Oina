from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_customer
from app.core.security import hash_password, verify_password, create_access_token
from app.models.customer import Customer
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, CustomerOut, UpdateProfileRequest, ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.phone == data.phone).first()

    if existing and existing.password_hash:
        raise HTTPException(status_code=400, detail="Phone already registered")

    if existing:
        existing.password_hash = hash_password(data.password)
        existing.name = data.name
        customer = existing
    else:
        customer = Customer(
            name=data.name,
            phone=data.phone,
            password_hash=hash_password(data.password),
        )
        db.add(customer)

    db.commit()
    db.refresh(customer)

    token = create_access_token(customer.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.phone == data.phone).first()
    if not customer or not customer.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(customer.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CustomerOut)
def get_me(current: Customer = Depends(get_current_customer)):
    return current


@router.patch("/me", response_model=CustomerOut)
def update_me(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    if data.name is not None:
        current.name = data.name
    if data.phone is not None:
        existing = db.query(Customer).filter(Customer.phone == data.phone, Customer.id != current.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone already in use")
        current.phone = data.phone
    if data.address is not None:
        current.address = data.address
    db.commit()
    db.refresh(current)
    return current


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    if not current.password_hash or not verify_password(data.old_password, current.password_hash):
        raise HTTPException(status_code=401, detail="Invalid current password")
    current.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.post("/admin-login")
def admin_login(data: LoginRequest):
    if data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    token = create_access_token(0)
    return {"access_token": token, "token_type": "bearer"}