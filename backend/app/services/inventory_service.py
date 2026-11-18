from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.dependencies import PaginationParams
from app.models.product import Product
from app.utils.pagination import escape_like, paginate


def list_low_stock(
    db: Session, pagination: PaginationParams, *, search: str | None = None
) -> tuple[list[Product], int]:
    """Active products whose stock is at or below their minimum threshold."""
    stmt = select(Product).where(
        Product.is_active.is_(True),
        Product.stock_quantity <= Product.minimum_stock,
    )

    if search:
        pattern = f"%{escape_like(search.strip())}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.barcode.ilike(pattern),
            )
        )

    stmt = stmt.order_by(
        (Product.stock_quantity - Product.minimum_stock).asc(),
        Product.name.asc(),
        Product.id,
    )
    return paginate(db, stmt, pagination)
