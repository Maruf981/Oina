from datetime import datetime, date

from pydantic import BaseModel


class EmployeeBase(BaseModel):
    name: str
    role: str | None = None
    salary: float | None = None
    phone: str | None = None
    address: str | None = None
    hire_date: date | None = None
    notes: str | None = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeOut(EmployeeBase):
    id: int
    photo_url: str | None = None
    is_archived: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
