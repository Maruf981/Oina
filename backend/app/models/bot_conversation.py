from datetime import datetime
from sqlalchemy import BigInteger, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BotConversation(Base):
    __tablename__ = "bot_conversations"

    telegram_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    history: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
