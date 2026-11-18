import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import get_current_admin, get_current_user
from app.dependencies import PaginationParams, get_db
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.common import DataResponse
from app.schemas.product import (
    ProductAdminOut,
    ProductCreate,
    ProductUpdate,
    product_to_dict,
)
from app.services import inventory_service, product_service

router = APIRouter(prefix="/products", tags=["products"])

SortOption = Literal[
    "name",
    "-name",
    "selling_price",
    "-selling_price",
    "stock_quantity",
    "-stock_quantity",
    "created_at",
    "-created_at",
]


def _serialize(product: Product, current_user: User) -> dict:
    include_cost = current_user.role == UserRole.ADMIN
    return product_to_dict(product, include_cost=include_cost)


# Static paths must be declared before /{product_id}.
@router.get("/search", summary="POS product search")
def search_products(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    products = product_service.search_products(db, q)
    return {
        "data": [_serialize(product, current_user) for product in products],
        "message": "OK",
    }


@router.get("/low-stock", summary="Products at or below minimum stock")
def low_stock_products(
    pagination: PaginationParams = Depends(),
    search: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    items, total = inventory_service.list_low_stock(db, pagination, search=search)
    return {
        "data": {
            "items": [product_to_dict(item, include_cost=True) for item in items],
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
        },
        "message": "OK",
    }


@router.get("", summary="List products")
def list_products(
    pagination: PaginationParams = Depends(),
    search: str | None = Query(default=None, max_length=200),
    category: str | None = Query(default=None, max_length=100),
    is_active: bool | None = Query(default=None),
    sort: SortOption = Query(default="name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    items, total = product_service.list_products(
        db,
        pagination,
        search=search,
        category=category,
        is_active=is_active,
        sort=sort,
    )
    return {
        "data": {
            "items": [_serialize(product, current_user) for product in items],
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
        },
        "message": "OK",
    }


@router.get("/{product_id}", summary="Product details")
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    product = product_service.get_product(db, product_id)
    return {"data": _serialize(product, current_user), "message": "OK"}


@router.post(
    "",
    status_code=201,
    response_model=DataResponse[ProductAdminOut],
    summary="Create a product",
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    product = product_service.create_product(db, payload)
    return {"data": product, "message": "Product created"}


@router.patch(
    "/{product_id}",
    response_model=DataResponse[ProductAdminOut],
    summary="Update a product",
)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    product = product_service.update_product(db, product_id, payload)
    return {"data": product, "message": "Product updated"}


@router.delete("/{product_id}", status_code=204, summary="Disable a product")
def deactivate_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    product_service.deactivate_product(db, product_id)
