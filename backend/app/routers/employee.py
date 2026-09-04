from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeOut

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/", response_model=list[EmployeeOut])
def list_employees(include_archived: bool = False, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    query = db.query(Employee)
    if not include_archived:
        query = query.filter(Employee.is_archived == False)
    return query.order_by(Employee.id.desc()).all()


@router.post("/", response_model=EmployeeOut)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    employee = Employee(**data.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, data: EmployeeCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    for key, value in data.model_dump().items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", response_model=EmployeeOut)
def archive_employee(employee_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_archived = True
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/{employee_id}/restore", response_model=EmployeeOut)
def restore_employee(employee_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_archived = False
    db.commit()
    db.refresh(employee)
    return employee
