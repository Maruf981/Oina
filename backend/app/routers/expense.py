from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return db.query(Expense).order_by(Expense.expense_date.desc()).all()


@router.post("/", response_model=ExpenseOut)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    expense = Expense(title=data.title, amount=data.amount, expense_date=data.expense_date)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"status": "deleted"}
