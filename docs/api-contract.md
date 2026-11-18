# API contract — ORVIA

Base path: `/api/v1`. Interactive docs: `GET /docs` (OpenAPI at
`/openapi.json`). Health probe: `GET /health`.

## Conventions

- All routes except `POST /auth/login` require
  `Authorization: Bearer <access_token>`.
- Success: `{"data": {...}, "message": "..."}`.
  Codes: 200 read/update, 201 create, 204 no body.
- Paginated list:
  `{"data": {"items": [...], "total": 120, "page": 1, "page_size": 20}, "message": "OK"}`.
- Non-paginated search/report lists return `{"data": [...], "message": "OK"}`.
- Error: `{"detail": "...", "code": "...", ...}` (`errors` for 422, `meta` when
  useful such as available stock).
- Money is serialized as a string with two decimals (`"12.50"`).
- IDs are UUIDs, timestamps ISO 8601 (UTC).
- `page` starts at 1, `page_size` defaults to 20 and is capped at 100.
- Cashier-scoped data is filtered on the server (`cashier_id = current user`).

## Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Pydantic input validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `USER_INACTIVE` | 403 | Account disabled at login |
| `TOKEN_INVALID` | 401 | Missing / expired / invalid token |
| `FORBIDDEN` | 403 | Role not allowed |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `SALE_NOT_FOUND` | 404 | Not found |
| `DUPLICATE_EMAIL` / `DUPLICATE_SKU` / `DUPLICATE_BARCODE` | 409 | Duplicate unique value |
| `PRODUCT_INACTIVE` | 409 | Product disabled during a sale |
| `INSUFFICIENT_STOCK` | 409 | Not enough stock; `meta`: product_id, available, requested |
| `SALE_ALREADY_CANCELLED` | 409 | Invoice already cancelled |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | Key belongs to another user |
| `INVALID_DISCOUNT` | 400 | Discount exceeds the subtotal |
| `EMPTY_CART` | 422 | No sale items |
| `INVALID_DATE_RANGE` | 400 | `from > to` or range > 366 days |
| `CANNOT_MODIFY_SELF` / `LAST_ADMIN` | 409 | Admin self-lock protection |
| `INTERNAL_ERROR` | 500 | Unexpected server error (no traceback leaked) |

## Auth

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Body `{email, password}` → `{access_token, token_type: "bearer", expires_in, user}` |
| GET | `/auth/me` | any | Current user profile |

Login flow: find by lowercased email → verify bcrypt hash → require `is_active`
→ issue JWT (`sub`, `role`, `exp`). A disabled account receives
`403 USER_INACTIVE`; a disabled account holding a valid token receives
`401 TOKEN_INVALID`. Passwords are never returned.

## Users (Admin only)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users` | Paginated; filters `search`, `role`, `is_active` |
| POST | `/users` | `{full_name, email, password (>=8), role}` → 201 |
| PATCH | `/users/{id}` | Update `full_name` and/or `role` |
| PATCH | `/users/{id}/status` | `{"is_active": bool}` |

Guards: cannot disable/demote yourself, cannot demote the last active admin,
`password_hash` is never serialized.

## Products

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/products` | any | Paginated; `search`, `category`, `is_active`, `sort` |
| GET | `/products/search?q=` | any | POS search: active only, max 20, exact SKU/barcode first, then ILIKE name/SKU/barcode |
| GET | `/products/low-stock` | Admin | `stock_quantity <= minimum_stock` and active |
| GET | `/products/{id}` | any | Details |
| POST | `/products` | Admin | Create → 201 |
| PATCH | `/products/{id}` | Admin | Partial update (includes absolute `stock_quantity` correction) |
| DELETE | `/products/{id}` | Admin | Soft disable → 204 |

Response schema depends on role: `ProductAdminOut` includes `cost_price`,
`ProductCashierOut` omits it. `barcode: ""` is normalised to `NULL`; `sku` and
`name` are trimmed; duplicate integrity errors become 409.

Route order matters: `/products/search` and `/products/low-stock` are declared
before `/products/{id}`.

## Sales & invoices

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/sales` | any | Create sale → 201 (200 when replaying the same key) |
| GET | `/sales` | any | History; filters `from`, `to`, `status`, `payment_method`, `invoice_number`, `cashier_id` (Admin) |
| GET | `/sales/{id}` | any | Sale detail with items (cashier: own only, else 404) |
| POST | `/sales/{id}/cancel` | Admin | One-time cancellation, restores stock |
| GET | `/sales/{id}/invoice` | any | Print payload + cashier name + currency |

### Create sale

Header: `Idempotency-Key: <8–100 chars>` (required).

```json
{
  "items": [
    {"product_id": "UUID", "quantity": 2},
    {"product_id": "UUID", "quantity": 1}
  ],
  "payment_method": "CASH",
  "discount_amount": "1.50"
}
```

Rules: non-empty items (max 100), `quantity >= 1`, duplicate product IDs are
merged, `extra='forbid'` rejects client prices/totals/status/cashier_id.
The server locks product rows in `id` order, reads prices/costs/names/SKUs from
the database, computes totals with `Decimal`, generates the invoice number,
snapshots line data, deducts stock and commits once.

Response data:
`{id, invoice_number, status, cashier:{id,full_name}, subtotal,
discount_amount, tax_amount, total_amount, payment_method, created_at,
item_count, items:[{product_id, product_name, sku, quantity, unit_price,
line_total}]}`.
`unit_cost` is added to each item only in Admin create/detail/cancel responses;
cashiers and invoice print payloads never receive it.

Same key twice: one invoice, stock deducted once, `200` with the original
invoice (`message: "Sale replayed"`). Same key from another user:
`409 IDEMPOTENCY_KEY_CONFLICT`. Empty items: `422 EMPTY_CART`.

### History, details and invoice

`GET /sales` is paginated and returns summary rows
`{id, invoice_number, status, cashier:{id,full_name}, subtotal,
discount_amount, tax_amount, total_amount, payment_method, created_at,
item_count}` without the `items` array. Filters: `from`, `to` (inclusive in
`REPORT_TIMEZONE`), `status`, `payment_method`, partial `invoice_number`, and
`cashier_id` (Admin). A cashier is always scoped to their own sales; requesting
another cashier's detail or invoice returns `404 SALE_NOT_FOUND`.

`GET /sales/{id}/invoice` returns the detail shape plus `store_name` and
`currency`, with no cost data, for printing.

### Cancel sale

Locks the invoice, rejects `CANCELLED` (`409`, no restock), locks its products
in `id` order, adds quantities back (even if the product is now disabled), sets
`status = CANCELLED`, commits. Returns the updated sale. Nothing is deleted.

## Reports (Admin only)

All exclude `CANCELLED`. `from`/`to` are `YYYY-MM-DD`, inclusive in
`REPORT_TIMEZONE`; `from <= to` and the range is at most 366 days. When omitted,
`from`/`to` default to the last 30 days ending today.

| Method | Endpoint | Response highlights |
| --- | --- | --- |
| GET | `/reports/dashboard` | `today{sales_total, invoice_count}`, `period{from,to,sales_total,invoice_count,average_invoice,gross_profit}`, `low_stock_count`, `top_products[5]`, `daily_sales[30]` |
| GET | `/reports/sales?from=&to=&group_by=day\|month` | `from`, `to`, `group_by`, `summary{sales_total, invoice_count, average_invoice, total_discount}`, `series[]` |
| GET | `/reports/top-products?from=&to=&limit=10` | `data: [{product_id, product_name, sku, quantity_sold, revenue}]` from `sale_items`, grouped by product |
| GET | `/reports/inventory` | `{total_products, active_products, out_of_stock, low_stock, stock_value_at_cost, low_stock_items[]}` |

- `gross_profit = Σ (unit_price - unit_cost) × quantity` from the sale-item
  snapshots (before invoice-level discount/tax).
- `daily_sales` and `series` fill missing buckets with zero values. `period` is
  `YYYY-MM-DD` for `group_by=day` and `YYYY-MM` for `group_by=month`.
- `top_products` sorts by quantity, then revenue, then name; `limit` is 1–50.
  Revenue is the sum of sale-item `line_total` values (before invoice-level
  discount/tax).
- Inventory `stock_value_at_cost` covers active products only. `low_stock`
  counts active products at or below `minimum_stock` (including zero stock) and
  returns up to 50 items sorted by stock then name.

