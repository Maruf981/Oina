from datetime import datetime, timedelta

import bcrypt
from jose import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(customer_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.CUSTOMER_JWT_EXPIRE_MINUTES)
    payload = {"sub": str(customer_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except Exception:
        return None


def create_admin_access_token(token_version: int) -> str:
    """
    Отдельная функция для admin-токенов — помимо стандартных claim'ов несёт
    явный type="admin" и ver=token_version. Версия сверяется с базой при
    каждой проверке (get_current_admin), что позволяет мгновенно отозвать
    ВСЕ ранее выданные admin-токены простым увеличением версии в базе,
    не трогая обычные клиентские токены.
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": "0", "type": "admin", "ver": token_version, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_admin_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") != "0" or payload.get("type") != "admin":
            return None
        return payload
    except Exception:
        return None