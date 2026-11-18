import uuid
from datetime import date

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import get_current_admin, get_current_user
from app.dependencies import PaginationParams, get_db
from app.models.user import User, UserRole
from app.schemas.sale import (
    PaymentMethod,
    SaleCreate,
    SaleStatus,
    invoice_to_dict,
    sale_to_dict,
)
from app.services import sale_service

router = APIRouter(prefix="/sales", tags=["sales"])


def _include_cost(current_user: User) -> bool:
    return current_user.role == UserRole.ADMIN


@router.get("", summary="List sales")
def list_sales(
    pagination: PaginationParams = Depends(),
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    status: SaleStatus | None = Query(default=None),
    payment_method: PaymentMethod | None = Query(default=None),
    invoice_number: str | None = Query(default=None, max_length=30),
    cashier_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    sales, total = sale_service.list_sales(
        db,
        pagination,
        current_user,
        date_from=date_from,
        date_to=date_to,
        status=status,
        payment_method=payment_method,
        invoice_number=invoice_number,
        cashier_id=cashier_id,
    )
    return {
        "data": {
            "items": [
                sale_to_dict(
                    sale,
                    include_cost=_include_cost(current_user),
                    include_items=False,
                )
                for sale in sales
            ],
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
        },
        "message": "OK",
    }


@router.post("", status_code=201, summary="Create a sale")
def create_sale(
    payload: SaleCreate,
    response: Response,
    idempotency_key: str = Header(
        alias="Idempotency-Key", min_length=8, max_length=100
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    sale, created = sale_service.create_sale(
        db, payload, idempotency_key, current_user
    )
    if not created:
        # An idempotent replay returns the original invoice without deducting stock.
        response.status_code = 200
    return {
        "data": sale_to_dict(sale, include_cost=_include_cost(current_user)),
        "message": "Sale created" if created else "Sale replayed",
    }


@router.post("/{sale_id}/cancel", summary="Cancel a sale")
def cancel_sale(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> dict:
    sale = sale_service.cancel_sale(db, sale_id)
    return {
        "data": sale_to_dict(sale, include_cost=_include_cost(current_user)),
        "message": "Sale cancelled",
    }


@router.get("/{sale_id}/invoice", summary="Invoice print payload")
def get_sale_invoice(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    sale = sale_service.get_sale(db, sale_id, current_user)
    return {
        "data": invoice_to_dict(
            sale,
            store_name=settings.APP_NAME,
            currency=settings.CURRENCY_CODE,
        ),
        "message": "OK",
    }


@router.get("/{sale_id}", summary="Sale details")
def get_sale(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    sale = sale_service.get_sale(db, sale_id, current_user)
    return {
        "data": sale_to_dict(
            sale, include_cost=_include_cost(current_user), include_items=True
        ),
        "message": "OK",
    }
