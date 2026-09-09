from sqlalchemy.orm import Session
from app.models.admin_settings import AdminSettings


def get_or_create(db: Session) -> AdminSettings:
    row = db.query(AdminSettings).filter(AdminSettings.id == 1).first()
    if not row:
        row = AdminSettings(id=1, token_version=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_current_version(db: Session) -> int:
    return get_or_create(db).token_version


def revoke_all_admin_sessions(db: Session) -> int:
    """Увеличивает версию admin-токена, мгновенно делая недействительными
    все ранее выданные admin-токены. Возвращает новую версию."""
    row = get_or_create(db)
    row.token_version += 1
    db.commit()
    db.refresh(row)
    return row.token_version
