from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.core.telegram_notify import send_admin_notification

router = APIRouter(prefix="/support", tags=["support"])


class EscalateRequest(BaseModel):
    phone: str | None = None
    question: str


@router.post("/escalate")
def escalate(data: EscalateRequest, background_tasks: BackgroundTasks):
    """
    Передача вопроса клиента администратору, когда ИИ-ассистент не может помочь
    (не знает ответа, или клиент явно просит живого человека).
    """
    text = (
        f"🆘 <b>Не смог ответить клиенту</b>\n"
        f"Телефон: {data.phone or 'не указан'}\n"
        f"Вопрос: {data.question}"
    )
    background_tasks.add_task(send_admin_notification, text)
    return {"ok": True}
