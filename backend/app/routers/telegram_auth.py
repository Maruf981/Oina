import hashlib
import hmac
from urllib.parse import parse_qsl

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter(prefix="/telegram-auth", tags=["telegram-auth"])


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

    import sys
    print(f"DEBUG bot_token repr: {repr(bot_token)}", flush=True, file=sys.stderr)
    print(f"DEBUG received_hash: {received_hash}", flush=True, file=sys.stderr)
    print(f"DEBUG calculated_hash: {calculated_hash}", flush=True, file=sys.stderr)
    print(f"DEBUG data_check_string: {data_check_string}", flush=True, file=sys.stderr)

    if calculated_hash != received_hash:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid signature. token_len={len(bot_token)} received={received_hash[:10]} calculated={calculated_hash[:10]}"
        )

    return parsed


@router.post("/admin")
def telegram_admin_login(data: TelegramAuthRequest):
    parsed = verify_telegram_init_data(data.init_data, settings.BOT_TOKEN_ADMIN)

    import json
    user = json.loads(parsed.get("user", "{}"))
    telegram_id = user.get("id")

    if telegram_id != settings.ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Not the admin")

    token = create_access_token(0)
    return {"access_token": token, "token_type": "bearer"}