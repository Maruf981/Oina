import hashlib
import hmac
import time
from urllib.parse import parse_qsl

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_admin_access_token
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/telegram-auth", tags=["telegram-auth"])

MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60  # 24 часа — рекомендация Telegram


class TelegramAuthRequest(BaseModel):
    init_data: str


def verify_telegram_init_data(init_data: str, bot_token: str) -> dict:
    parsed = dict(parse_qsl(init_data))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="No hash in init data")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")

    auth_date = parsed.get("auth_date")
    if not auth_date or not auth_date.isdigit():
        raise HTTPException(status_code=401, detail="Missing or invalid auth_date")
    age = time.time() - int(auth_date)
    if age > MAX_INIT_DATA_AGE_SECONDS or age < -60:
        raise HTTPException(status_code=401, detail="Telegram init data expired, reopen the app")

    return parsed


@router.post("/admin")
def telegram_admin_login(data: TelegramAuthRequest, db: Session = Depends(get_db)):
    parsed = verify_telegram_init_data(data.init_data, settings.BOT_TOKEN_ADMIN)

    import json
    user = json.loads(parsed.get("user", "{}"))
    telegram_id = user.get("id")

    if telegram_id != settings.ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Not the admin")

    from app.repositories.admin_settings import get_current_version
    token = create_admin_access_token(get_current_version(db))
    return {"access_token": token, "token_type": "bearer"}