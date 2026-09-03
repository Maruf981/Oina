from datetime import date, datetime
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    expense_date: date


class ExpenseOut(BaseModel):
    id: int
    title: str
    amount: float
    expense_date: date
    created_at: datetime

    class Config:
        from_attributes = True
