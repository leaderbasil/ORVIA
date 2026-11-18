from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sale_item import SaleItem
    from app.models.user import User


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_nonneg"),
        CheckConstraint("discount_amount >= 0", name="ck_sales_discount_nonneg"),
        CheckConstraint("tax_amount >= 0", name="ck_sales_tax_nonneg"),
        CheckConstraint("total_amount >= 0", name="ck_sales_total_nonneg"),
        CheckConstraint(
            "discount_amount <= subtotal", name="ck_sales_discount_le_subtotal"
        ),
        CheckConstraint(
            "total_amount = subtotal - discount_amount + tax_amount",
            name="ck_sales_total_formula",
        ),
        CheckConstraint("status IN ('COMPLETED','CANCELLED')", name="ck_sales_status"),
        CheckConstraint(
            "payment_method IN ('CASH','CARD')", name="ck_sales_payment"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    cashier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default=text("0")
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default=text("0")
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="COMPLETED", server_default=text("'COMPLETED'")
    )
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    cashier: Mapped[User] = relationship(back_populates="sales")
    items: Mapped[list[SaleItem]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="SaleItem.id",
    )
