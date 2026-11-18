"""initial schema (users, products, sales, sale_items)

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = postgresql.ENUM("ADMIN", "CASHIER", name="user_role", create_type=False)


def upgrade() -> None:
    op.execute("CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER')")
    # Invoice numbers are generated from this sequence: INV-{YYYY}-{seq:06d}.
    op.execute("CREATE SEQUENCE invoice_number_seq START 1")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("barcode", sa.String(length=64), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column(
            "unit", sa.String(length=20), server_default=sa.text("'piece'"), nullable=False
        ),
        sa.Column("cost_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("selling_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "stock_quantity", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "minimum_stock", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("cost_price >= 0", name="ck_products_cost_nonneg"),
        sa.CheckConstraint("selling_price >= 0", name="ck_products_price_nonneg"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_products_stock_nonneg"),
        sa.CheckConstraint("minimum_stock >= 0", name="ck_products_min_nonneg"),
        sa.PrimaryKeyConstraint("id", name="pk_products"),
        sa.UniqueConstraint("sku", name="uq_products_sku"),
        sa.UniqueConstraint("barcode", name="uq_products_barcode"),
    )
    op.create_index("ix_products_name", "products", ["name"], unique=False)

    op.create_table(
        "sales",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invoice_number", sa.String(length=30), nullable=False),
        sa.Column("cashier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "discount_amount",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "tax_amount",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'COMPLETED'"),
            nullable=False,
        ),
        sa.Column("idempotency_key", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_nonneg"),
        sa.CheckConstraint("discount_amount >= 0", name="ck_sales_discount_nonneg"),
        sa.CheckConstraint("tax_amount >= 0", name="ck_sales_tax_nonneg"),
        sa.CheckConstraint("total_amount >= 0", name="ck_sales_total_nonneg"),
        sa.CheckConstraint(
            "discount_amount <= subtotal", name="ck_sales_discount_le_subtotal"
        ),
        sa.CheckConstraint(
            "total_amount = subtotal - discount_amount + tax_amount",
            name="ck_sales_total_formula",
        ),
        sa.CheckConstraint(
            "status IN ('COMPLETED','CANCELLED')", name="ck_sales_status"
        ),
        sa.CheckConstraint(
            "payment_method IN ('CASH','CARD')", name="ck_sales_payment"
        ),
        sa.ForeignKeyConstraint(
            ["cashier_id"],
            ["users.id"],
            name="fk_sales_cashier_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sales"),
        sa.UniqueConstraint("invoice_number", name="uq_sales_invoice_number"),
        sa.UniqueConstraint("idempotency_key", name="uq_sales_idempotency_key"),
    )
    op.create_index("ix_sales_created_at", "sales", ["created_at"], unique=False)
    op.create_index("ix_sales_cashier_id", "sales", ["cashier_id"], unique=False)

    op.create_table(
        "sale_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sale_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("line_total", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_items_qty_pos"),
        sa.CheckConstraint("unit_price >= 0", name="ck_items_price_nonneg"),
        sa.CheckConstraint("unit_cost >= 0", name="ck_items_cost_nonneg"),
        sa.CheckConstraint("line_total >= 0", name="ck_items_line_nonneg"),
        sa.CheckConstraint(
            "line_total = quantity * unit_price", name="ck_items_line_formula"
        ),
        sa.ForeignKeyConstraint(
            ["sale_id"],
            ["sales.id"],
            name="fk_sale_items_sale_id_sales",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_sale_items_product_id_products",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sale_items"),
    )
    op.create_index("ix_sale_items_sale_id", "sale_items", ["sale_id"], unique=False)
    op.create_index(
        "ix_sale_items_product_id", "sale_items", ["product_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_sale_items_product_id", table_name="sale_items")
    op.drop_index("ix_sale_items_sale_id", table_name="sale_items")
    op.drop_table("sale_items")

    op.drop_index("ix_sales_cashier_id", table_name="sales")
    op.drop_index("ix_sales_created_at", table_name="sales")
    op.drop_table("sales")

    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("products")

    op.drop_table("users")

    op.execute("DROP SEQUENCE IF EXISTS invoice_number_seq")
    op.execute("DROP TYPE IF EXISTS user_role")
