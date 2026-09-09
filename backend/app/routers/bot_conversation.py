from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import verify_bot_secret
from app.models.bot_conversation import BotConversation

router = APIRouter(prefix="/bot-conversations", tags=["bot-conversations"])

MAX_HISTORY_MESSAGES = 100


class SaveHistoryRequest(BaseModel):
    history: list


@router.get("/{telegram_id}")
def get_history(
    telegram_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    """
    Получить сохранённую историю диалога клиента с ИИ-ботом — используется, чтобы
    контекст переживал перезапуск/деплой бота (обычная память процесса сбрасывается).
    Доступно только самому боту (проверка общего секрета), не публично по telegram_id.
    """
    conv = db.query(BotConversation).filter(BotConversation.telegram_id == telegram_id).first()
    return {"history": conv.history if conv else []}


@router.put("/{telegram_id}")
def save_history(
    telegram_id: int,
    data: SaveHistoryRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    if len(data.history) > MAX_HISTORY_MESSAGES:
        raise HTTPException(status_code=400, detail=f"История слишком длинная (максимум {MAX_HISTORY_MESSAGES} сообщений)")

    conv = db.query(BotConversation).filter(BotConversation.telegram_id == telegram_id).first()
    if conv:
        conv.history = data.history
    else:
        conv = BotConversation(telegram_id=telegram_id, history=data.history)
        db.add(conv)
    db.commit()
    return {"ok": True}
