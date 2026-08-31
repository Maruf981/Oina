from pydantic import BaseModel


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str


class LoginRequest(BaseModel):
    phone: str
    password: str


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