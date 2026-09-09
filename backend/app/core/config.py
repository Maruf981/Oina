from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Oina.tj"

    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24

    TELEGRAM_BOT_TOKEN_CLIENT: str = ""
    TELEGRAM_BOT_TOKEN_ADMIN: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    ADMIN_PASSWORD: str
    FINANCE_PIN: str
    BOT_TOKEN_ADMIN: str = ""
    BOT_TOKEN_CLIENT: str = ""
    ADMIN_TELEGRAM_ID: int = 0
    ANTHROPIC_API_KEY: str = ""
    BOT_INTERNAL_SECRET: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
