import httpx

from app.core.config import settings


async def send_admin_notification(text: str) -> None:
    if not settings.BOT_TOKEN_ADMIN or not settings.ADMIN_TELEGRAM_ID:
        return
    url = f"https://api.telegram.org/bot{settings.BOT_TOKEN_ADMIN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                url,
                json={
                    "chat_id": settings.ADMIN_TELEGRAM_ID,
                    "text": text,
                    "parse_mode": "HTML",
                },
            )
    except Exception:
        pass


async def send_customer_notification(telegram_id: int, text: str) -> None:
    if not settings.BOT_TOKEN_CLIENT or not telegram_id:
        return
    url = f"https://api.telegram.org/bot{settings.BOT_TOKEN_CLIENT}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                url,
                json={
                    "chat_id": telegram_id,
                    "text": text,
                    "parse_mode": "HTML",
                },
            )
    except Exception:
        pass


async def send_admin_bot_message(chat_id: int, text: str, reply_markup: dict | None = None) -> None:
    if not settings.BOT_TOKEN_ADMIN or not chat_id:
        return
    url = f"https://api.telegram.org/bot{settings.BOT_TOKEN_ADMIN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json=payload)
    except Exception:
        pass
