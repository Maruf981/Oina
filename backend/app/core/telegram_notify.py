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
