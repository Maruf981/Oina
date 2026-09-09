from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AdminSettings(Base):
    """
    Служебная таблица из одной строки (id=1) — хранит текущую версию admin-токена.
    Увеличение token_version мгновенно делает недействительными ВСЕ ранее выданные
    admin-токены (например, если админ-токен утёк), не трогая обычных клиентов.
    """
    __tablename__ = "admin_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_version: Mapped[int] = mapped_column(default=1, server_default="1")
