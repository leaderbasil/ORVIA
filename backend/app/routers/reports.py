from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import get_current_admin
from app.dependencies import get_db
from app.models.user import User
from app.schemas.report import GroupBy
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard", summary="Admin dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin),
) -> dict:
    return {"data": report_service.dashboard(db), "message": "OK"}


@router.get("/sales", summary="Sales report")
def get_sales_report(
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    group_by: GroupBy = Query(default="day"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin),
) -> dict:
    return {
        "data": report_service.sales_report(db, date_from, date_to, group_by),
        "message": "OK",
    }


@router.get("/top-products", summary="Top products report")
def get_top_products(
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin),
) -> dict:
    return {
        "data": report_service.top_products_report(
            db, date_from, date_to, limit
        ),
        "message": "OK",
    }


@router.get("/inventory", summary="Inventory report")
def get_inventory_report(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin),
) -> dict:
    return {"data": report_service.inventory_report(db), "message": "OK"}
