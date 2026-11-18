import uuid
from typing import NoReturn

from sqlalchemy import case, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.dependencies import PaginationParams
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.pagination import escape_like, paginate

SORT_CLAUSES = {
    "name": Product.name.asc(),
    "-name": Product.name.desc(),
    "selling_price": Product.selling_price.asc(),
    "-selling_price": Product.selling_price.desc(),
    "stock_quantity": Product.stock_quantity.asc(),
    "-stock_quantity": Product.stock_quantity.desc(),
    "created_at": Product.created_at.asc(),
    "-created_at": Product.created_at.desc(),
}

DUPLICATE_BY_CONSTRAINT = {
    "uq_products_sku": ("DUPLICATE_SKU", "SKU already exists"),
    "uq_products_barcode": ("DUPLICATE_BARCODE", "Barcode already exists"),
}


def _constraint_name(exc: IntegrityError) -> str:
    diag = getattr(exc.orig, "diag", None)
    return getattr(diag, "constraint_name", "") or ""


def _raise_duplicate(
    db: Session, exc: IntegrityError, *, sku: str | None, barcode: str | None
) -> NoReturn:
    """Translate a unique violation into the API's duplicate error codes."""
    mapped = DUPLICATE_BY_CONSTRAINT.get(_constraint_name(exc))
    if mapped is not None:
        code, detail = mapped
        raise AppException(409, code, detail) from exc

    if sku and db.scalar(select(Product.id).where(Product.sku == sku)) is not None:
        raise AppException(409, "DUPLICATE_SKU", "SKU already exists") from exc
    if (
        barcode
        and db.scalar(select(Product.id).where(Product.barcode == barcode)) is not None
    ):
        raise AppException(409, "DUPLICATE_BARCODE", "Barcode already exists") from exc
    raise AppException(409, "DUPLICATE_SKU", "Duplicate product value") from exc


def _ensure_unique(
    db: Session,
    *,
    sku: str | None,
    barcode: str | None,
    exclude_id: uuid.UUID | None = None,
) -> None:
    if sku is not None:
        stmt = select(Product.id).where(Product.sku == sku)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        if db.scalar(stmt) is not None:
            raise AppException(409, "DUPLICATE_SKU", "SKU already exists")

    if barcode is not None:
        stmt = select(Product.id).where(Product.barcode == barcode)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        if db.scalar(stmt) is not None:
            raise AppException(409, "DUPLICATE_BARCODE", "Barcode already exists")


def get_product(db: Session, product_id: uuid.UUID) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")
    return product


def list_products(
    db: Session,
    pagination: PaginationParams,
    *,
    search: str | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    sort: str = "name",
) -> tuple[list[Product], int]:
    stmt = select(Product)

    if search:
        pattern = f"%{escape_like(search.strip())}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.barcode.ilike(pattern),
            )
        )
    if category:
        stmt = stmt.where(Product.category.ilike(escape_like(category.strip())))
    if is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))

    stmt = stmt.order_by(SORT_CLAUSES.get(sort, Product.name.asc()), Product.id)
    return paginate(db, stmt, pagination)


def search_products(db: Session, query: str) -> list[Product]:
    """POS search: active products, exact SKU/barcode first, then name ILIKE."""
    term = query.strip()
    if not term:
        return []

    pattern = f"%{escape_like(term)}%"
    exact_match = or_(Product.sku == term, Product.barcode == term)
    stmt = (
        select(Product)
        .where(
            Product.is_active.is_(True),
            or_(
                exact_match,
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.barcode.ilike(pattern),
            ),
        )
        .order_by(case((exact_match, 0), else_=1), Product.name.asc())
        .limit(20)
    )
    return list(db.scalars(stmt).all())


def create_product(db: Session, payload: ProductCreate) -> Product:
    _ensure_unique(db, sku=payload.sku, barcode=payload.barcode)

    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_duplicate(db, exc, sku=payload.sku, barcode=payload.barcode)

    db.refresh(product)
    return product


def update_product(
    db: Session, product_id: uuid.UUID, payload: ProductUpdate
) -> Product:
    product = get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    _ensure_unique(
        db,
        sku=data.get("sku"),
        barcode=data.get("barcode"),
        exclude_id=product.id,
    )

    for field, value in data.items():
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_duplicate(
            db,
            exc,
            sku=data.get("sku") or product.sku,
            barcode=data.get("barcode"),
        )

    db.refresh(product)
    return product


def deactivate_product(db: Session, product_id: uuid.UUID) -> None:
    product = get_product(db, product_id)
    product.is_active = False
    db.commit()
