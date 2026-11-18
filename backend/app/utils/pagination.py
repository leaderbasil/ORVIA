from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.dependencies import PaginationParams


def escape_like(value: str) -> str:
    """Escape LIKE wildcards so user input is treated literally."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def paginate(
    db: Session, stmt: Select[Any], pagination: PaginationParams
) -> tuple[list[Any], int]:
    """Return (items of the current page, total rows) for a select statement."""
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    items = list(
        db.scalars(stmt.offset(pagination.offset).limit(pagination.page_size)).all()
    )
    return items, total
