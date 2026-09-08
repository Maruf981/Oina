from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.bot_conversation import BotConversation

router = APIRouter(prefix="/bot-conversations", tags=["bot-conversations"])


class SaveHistoryRequest(BaseModel):
    history: list


@router.get("/{telegram_id}")
def get_history(telegram_id: int, db: Session = Depends(get_db)):
    """
    Получить сохранённую историю диалога клиента с ИИ-ботом — используется, чтобы
    контекст переживал перезапуск/деплой бота (обычная память процесса сбрасывается).
    """
    conv = db.query(BotConversation).filter(BotConversation.telegram_id == telegram_id).first()
    return {"history": conv.history if conv else []}


@router.put("/{telegram_id}")
def save_history(telegram_id: int, data: SaveHistoryRequest, db: Session = Depends(get_db)):
    conv = db.query(BotConversation).filter(BotConversation.telegram_id == telegram_id).first()
    if conv:
        conv.history = data.history
    else:
        conv = BotConversation(telegram_id=telegram_id, history=data.history)
        db.add(conv)
    db.commit()
    return {"ok": True}
