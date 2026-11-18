# Requirements — ORVIA POS & Inventory (MVP)

A single-store grocery POS/inventory system. Not an ERP: it covers the core
sell + stock loop only.

## Goals

- Manage products, prices and stock.
- Fast search during checkout (name / SKU / barcode).
- Multi-line invoices with server-computed totals.
- Automatic stock deduction, never below zero.
- Sales history, basic reports and role-based access (Admin / Cashier).

## In scope

Login with JWT · user management + activation · product CRUD with soft
disable · search · low-stock list · multi-item sales · unique invoice numbers ·
payment method · stock updates inside one transaction · sales history +
details · one-time cancellation with stock restore · idempotent sale creation ·
dashboard and basic reports.

## Out of scope

Suppliers/purchasing, multi-branch/warehouse, advanced accounting, real payment
gateways, partial refunds, forecasting/AI, complex promotions, fine-grained
per-action permissions, category tables, stock-movement tables, refresh tokens,
fractional quantities.

## Approved decisions (authoritative)

| Topic | Decision |
| --- | --- |
| Tax | `TAX_RATE` Decimal, default `0.00`. `tax = round2((subtotal - discount) * TAX_RATE)`. Column always stored. |
| Discount | Invoice level, fixed amount, `0 <= discount <= subtotal`. Admin and Cashier may apply. |
| Currency | `CURRENCY_CODE` setting, 2 decimals, display only. |
| Rounding | `ROUND_HALF_UP` to `Decimal('0.01')`. |
| Quantities | Integers only in the MVP. |
| Cancellation | Admin only, once, no reason field. |
| Account creation | Admin only, no self-registration; first admin from a seed script. |
| Cashier visibility | Products without `cost_price`, own sales only, no reports/dashboard. |
| Auth | Access token only (JWT HS256, 30 min) in `sessionStorage`; 401 clears and redirects. |
| Reports | All report endpoints exclude `CANCELLED` invoices. |
| Dashboard period | Today + last 30 days. |
| Timezone | Store UTC `TIMESTAMPTZ`; group days by `REPORT_TIMEZONE`. |
| Invoice number | `INV-{YYYY}-{seq:06d}` from `invoice_number_seq` (never reset). |
| Idempotency | Required `Idempotency-Key` header on `POST /sales` (8–100 chars). |
| UI language | Arabic, RTL, single constants file. |
| Pagination | `page >= 1`, `page_size` default 20, max 100. |

## Roles

| Capability | Admin | Cashier |
| --- | --- | --- |
| Login + `/auth/me` | ✓ | ✓ |
| Dashboard + reports | ✓ | ✗ |
| View/search products | ✓ (with cost) | ✓ (without cost) |
| Create/update/disable product | ✓ | ✗ |
| Low stock / inventory | ✓ | ✗ |
| Create a sale | ✓ | ✓ |
| Sales history + invoice details | all | own only (others → 404) |
| Cancel a sale | ✓ | ✗ |
| User management | ✓ | ✗ |

Backend enforces every rule; hiding UI controls is cosmetic.

## Non-functional

- Money is `Decimal`/`NUMERIC(12,2)` end to end; JSON uses strings (`"12.50"`).
- Sync SQLAlchemy 2 with psycopg 3; endpoints are `def`.
- Router → Service → Model + Schemas; no repository layer.
- Every schema change through Alembic; no `create_all()` in production.
- Transactions for multi-step operations; row locks for sales stock.
- Real PostgreSQL for tests (locks/constraints cannot be simulated on SQLite).
- Arabic RTL UI with the Linear-inspired minimal design tokens.

## Delivery phases

1. Foundation: FastAPI, settings, DB, models, initial migration, CORS, error
   envelope, health, frontend shell with RTL layout.
2. Auth, permissions, users, products, search, low stock, login UI, product UI.
3. Sales service (locks, totals, idempotency, cancellation), invoices, POS UI.
4. Reports, dashboard, demo data, hardening, full docs and clean-env check.

Acceptance criteria are tracked in the root `README.md`.
