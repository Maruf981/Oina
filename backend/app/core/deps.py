import hmac

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.config import settings
from app.models.customer import Customer


def verify_bot_secret(x_bot_secret: str | None = Header(default=None)) -> bool:
    """
    Проверка внутреннего секрета между backend и Telegram-ботами (bot_client, bot_admin).
    Защищает эндпоинты вида link-telegram(-silent), которые не должны быть вызываемы
    напрямую кем угодно через API — только самими ботами, знающими общий секрет.
    """
    if not settings.BOT_INTERNAL_SECRET or not x_bot_secret:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not hmac.compare_digest(x_bot_secret, settings.BOT_INTERNAL_SECRET):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return True


def get_current_customer(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Customer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.removeprefix("Bearer ")
    customer_id = decode_access_token(token)
    if not customer_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")

    return customer


def get_current_customer_optional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Customer | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    customer_id = decode_access_token(token)
    if not customer_id:
        return None
    return db.query(Customer).filter(Customer.id == customer_id).first()


def get_current_admin(
    authorization: str | None = Header(default=None),
) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    customer_id = decode_access_token(token)
    if customer_id != 0:
        raise HTTPException(status_code=401, detail="Not an admin")
    return True


def get_current_admin_optional(
    authorization: str | None = Header(default=None),
) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.removeprefix("Bearer ")
    customer_id = decode_access_token(token)
    return customer_id == 0
