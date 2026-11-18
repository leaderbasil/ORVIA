from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sale_item import SaleItem


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("cost_price >= 0", name="ck_products_cost_nonneg"),
        CheckConstraint("selling_price >= 0", name="ck_products_price_nonneg"),
        CheckConstraint("stock_quantity >= 0", name="ck_products_stock_nonneg"),
        CheckConstraint("minimum_stock >= 0", name="ck_products_min_nonneg"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str] = mapped_column(
        String(20), nullable=False, default="piece", server_default=text("'piece'")
    )
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    minimum_stock: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    sale_items: Mapped[list[SaleItem]] = relationship(back_populates="product")
