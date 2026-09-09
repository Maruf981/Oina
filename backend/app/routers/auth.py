from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_customer, get_current_admin, verify_bot_secret
from app.core.security import hash_password, verify_password, create_access_token, create_admin_access_token
from app.models.customer import Customer
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, CustomerOut, UpdateProfileRequest, ChangePasswordRequest, DeleteAccountRequest, LinkTelegramRequest, VerifyResetCodeRequest, SilentLinkTelegramRequest

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


@router.delete("/me")
def delete_account(
    data: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    if not current.password_hash or not verify_password(data.password, current.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    current.name = None
    current.phone = f"deleted_{current.id}"
    current.password_hash = None
    current.address = None
    current.avatar_url = None
    current.telegram_id = None
    db.commit()
    return {"ok": True}
@router.post("/link-telegram-silent")
def link_telegram_silent(data: SilentLinkTelegramRequest, db: Session = Depends(get_db), _: bool = Depends(verify_bot_secret)):
    """
    Тихая привязка telegram_id к клиенту по номеру телефона — вызывается ботом при
    первом сообщении (после того как клиент поделился контактом), без генерации кода.
    Нужна только чтобы бэкенд знал, куда слать уведомления о статусе заказа.
    """
    customer = db.query(Customer).filter(Customer.phone == data.phone).first()
    if not customer:
        return {"linked": False}
    customer.telegram_id = data.telegram_id
    db.commit()
    return {"linked": True, "name": customer.name}


@router.post("/link-telegram")
def link_telegram(data: LinkTelegramRequest, db: Session = Depends(get_db), _: bool = Depends(verify_bot_secret)):
    """
    Вызывается ботом (bot_client), когда клиент присылает номер телефона
    в ответ на команду /reset. Привязывает telegram_id к клиенту (если ещё
    не привязан) и генерирует одноразовый код для сброса пароля.
    """
    import random
    from datetime import datetime, timedelta

    customer = db.query(Customer).filter(Customer.phone == data.phone).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент с таким номером не найден")

    customer.telegram_id = data.telegram_id
    code = f"{random.randint(0, 999999):06d}"
    customer.reset_code = code
    customer.reset_code_expires = datetime.utcnow() + timedelta(minutes=10)
    customer.reset_code_attempts = 0
    db.commit()

    return {"code": code, "name": customer.name}


MAX_RESET_CODE_ATTEMPTS = 5


@router.post("/verify-reset-code")
def verify_reset_code(data: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    from datetime import datetime

    # SELECT ... FOR UPDATE — блокирует строку клиента на время проверки, чтобы
    # параллельные запросы (перебор кода в несколько потоков) сериализовались,
    # а не читали одно и то же значение reset_code_attempts до чужого commit.
    customer = db.query(Customer).filter(Customer.phone == data.phone).with_for_update().first()
    if not customer or not customer.reset_code or not customer.reset_code_expires:
        raise HTTPException(status_code=400, detail="Код не запрошен или устарел")
    if customer.reset_code_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Код истёк, запросите новый")
    if customer.reset_code_attempts >= MAX_RESET_CODE_ATTEMPTS:
        customer.reset_code = None
        customer.reset_code_expires = None
        customer.reset_code_attempts = 0
        db.commit()
        raise HTTPException(status_code=400, detail="Слишком много неверных попыток. Запросите новый код")
    if customer.reset_code != data.code:
        customer.reset_code_attempts += 1
        db.commit()
        remaining = MAX_RESET_CODE_ATTEMPTS - customer.reset_code_attempts
        raise HTTPException(status_code=400, detail=f"Неверный код. Осталось попыток: {remaining}")

    customer.password_hash = hash_password(data.new_password)
    customer.reset_code = None
    customer.reset_code_expires = None
    customer.reset_code_attempts = 0
    db.commit()

    return {"ok": True}


@router.post("/admin-login")
def admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    if data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    from app.repositories.admin_settings import get_current_version
    token = create_admin_access_token(get_current_version(db))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/revoke-admin-sessions")
def revoke_admin_sessions(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    """
    Отзывает ВСЕ ранее выданные admin-токены (например, если один из них
    утёк). После вызова текущая сессия тоже станет недействительной —
    потребуется войти заново.
    """
    from app.repositories.admin_settings import revoke_all_admin_sessions
    new_version = revoke_all_admin_sessions(db)
    return {"ok": True, "new_token_version": new_version}

@router.post("/verify-finance-pin")
def verify_finance_pin(data: dict, _: bool = Depends(get_current_admin)):
    pin = str(data.get("pin", ""))
    if pin != settings.FINANCE_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return {"ok": True}
