from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    phone: str | None = None


class SupplierOut(SupplierCreate):
    id: int

    class Config:
        from_attributes = True