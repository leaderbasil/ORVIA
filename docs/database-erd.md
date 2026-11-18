# Database design — ORVIA

Four tables only: `users`, `products`, `sales`, `sale_items`, plus the
`user_role` enum type and the `invoice_number_seq` sequence. 41 columns total.

> In the diagram below, every `numeric` attribute is `NUMERIC(12,2)`.

```mermaid
erDiagram
    USERS ||--o{ SALES : "processes"
    SALES ||--o{ SALE_ITEMS : "contains"
    PRODUCTS ||--o{ SALE_ITEMS : "snapshotted in"

    USERS {
        uuid id PK
        varchar(150) full_name
        varchar(255) email UK
        varchar(255) password_hash
        user_role role
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    PRODUCTS {
        uuid id PK
        varchar(200) name
        varchar(64) sku UK
        varchar(64) barcode UK
        varchar(100) category
        varchar(20) unit
        numeric cost_price
        numeric selling_price
        integer stock_quantity
        integer minimum_stock
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    SALES {
        uuid id PK
        varchar(30) invoice_number UK
        uuid cashier_id FK
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric total_amount
        varchar(20) payment_method
        varchar(20) status
        varchar(100) idempotency_key UK
        timestamptz created_at
    }

    SALE_ITEMS {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        varchar(200) product_name
        varchar(64) sku
        integer quantity
        numeric unit_price
        numeric unit_cost
        numeric line_total
    }
```

## Rules encoded in the database

- Money: `NUMERIC(12,2)` everywhere, with non-negative CHECK constraints.
- `sales.total_amount = subtotal - discount_amount + tax_amount` (CHECK).
- `sales.discount_amount <= subtotal` (CHECK).
- `sale_items.line_total = quantity * unit_price` (CHECK) and `quantity > 0`.
- `sales.status IN ('COMPLETED','CANCELLED')`,
  `sales.payment_method IN ('CASH','CARD')`.
- `products.barcode` is nullable and unique; empty input is normalised to NULL.
- FKs use `ON DELETE RESTRICT`: history is never deleted, only soft-disabled.
- Every sale carries a unique `idempotency_key`.
- Invoice numbers come from `CREATE SEQUENCE invoice_number_seq START 1`
  formatted as `INV-{YYYY}-{seq:06d}`. The sequence is not reset yearly, so
  gaps are acceptable.

## Indexes

| Index | Purpose |
| --- | --- |
| `ix_products_name` | product search / ordering |
| `ix_sales_created_at` | sales history + reports by date |
| `ix_sales_cashier_id` | cashier-scoped sales list |
| `ix_sale_items_sale_id` | invoice details |
| `ix_sale_items_product_id` | top products / profit aggregation |

Unique constraints already index `users.email`, `products.sku`,
`products.barcode`, `sales.invoice_number`, `sales.idempotency_key`.

## Timestamps

All timestamps are `TIMESTAMPTZ` stored in UTC. Daily report grouping uses
`REPORT_TIMEZONE` (default `UTC`).

The full reference DDL lives in `backend/alembic/versions/0001_initial_schema.py`.
