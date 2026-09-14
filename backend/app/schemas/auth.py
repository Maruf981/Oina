import re

from pydantic import BaseModel, field_validator


def extract_digits(phone: str) -> str:
    """Оставляет только 9 значащих цифр номера, отбрасывая код страны."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 12 and digits.startswith("992"):
        digits = digits[3:]
    return digits


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        digits = extract_digits(v)
        if len(digits) != 9:
            raise ValueError("Номер должен содержать 9 цифр, например 900796328")
        return f"+992{digits}"


class LoginRequest(BaseModel):
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        digits = extract_digits(v)
        return f"+992{digits}" if len(digits) == 9 else (v or "").strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CustomerOut(BaseModel):
    id: int
    name: str | None
    phone: str
    address: str | None
    avatar_url: str | None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
class DeleteAccountRequest(BaseModel):
    password: str


class LinkTelegramRequest(BaseModel):
    phone: str
    telegram_id: int


class SilentLinkTelegramRequest(BaseModel):
    phone: str
    telegram_id: int


class VerifyResetCodeRequest(BaseModel):
    phone: str
    code: str
    new_password: str
