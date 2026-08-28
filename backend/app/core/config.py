from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Oina.tj"

    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24

    TELEGRAM_BOT_TOKEN_CLIENT: str = ""
    TELEGRAM_BOT_TOKEN_ADMIN: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
