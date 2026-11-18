# Backend — ORVIA

FastAPI + SQLAlchemy 2 (sync, psycopg 3) + PostgreSQL + Alembic.

## Requirements

- Python 3.11+
- PostgreSQL 15+

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit DATABASE_URL / JWT_SECRET_KEY
alembic upgrade head
python -m app.db.init_db      # creates the first ADMIN from .env
uvicorn app.main:app --reload # http://localhost:8000/docs
```

Health probe: `GET /health`.

## Tests

Tests run against a real PostgreSQL database (`mini_grocery_pos_test`), because
row locks and CHECK constraints cannot be simulated on SQLite.

```bash
createdb mini_grocery_pos_test      # once
pytest
```

`tests/conftest.py` sets the env variables used by the app before import, so no
local `.env` is required for the test suite. It forces the app onto the test
database (name must end in `_test`); override the URL with
`TEST_DATABASE_URL=postgresql+psycopg://user:pass@host:port/mini_grocery_pos_test`.

## Demo data

After migrations and the first-admin seed:

```bash
python -m scripts.seed_demo
```

`DEMO_CASHIER_PASSWORD` is optional. The script creates `DEMO-*` products,
30 invoices over the last 30 days (three cancelled), a low-stock item and an
out-of-stock item. It is safe to run twice; existing demo sales are skipped.
All report endpoints are Admin-only and exclude cancelled invoices.

## Project layout

```
app/
  main.py            FastAPI app, CORS, exception handlers, /health
  dependencies.py    get_db(), pagination params
  core/              config, security (bcrypt + JWT), permissions, exceptions
  db/                engine/session, declarative base, first-admin seed
  models/            users, products, sales, sale_items
  schemas/           Pydantic request/response contracts
  services/          business logic + SQLAlchemy queries + commit/rollback
  routers/           thin HTTP layer
  utils/             money (Decimal/ROUND_HALF_UP), helpers
alembic/             migrations (includes user_role ENUM + invoice_number_seq)
scripts/             repeatable demo dataset (seed_demo.py)
tests/               pytest + HTTPX
```

Layer rules: Router → Service → Model. No repository layer. Routers never run
queries or commit; services never touch `Request`/`Response`.

## Implementation status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: config, DB, models, initial migration, error envelope, health, frontend shell | done |
| 2 | Auth/JWT, permissions, users CRUD + activation, products CRUD/search/low stock | done |
| 3 | Sales, invoices, idempotency, cancellation | done |
| 4 | Reports, dashboard, demo data, hardening | done |

## Assumptions

- A disabled user presenting a still-valid JWT receives `401 TOKEN_INVALID`
  (per section 6); a disabled user trying to log in receives
  `403 USER_INACTIVE` (per the error table).
- `POST /sales` locks products in `id` order, computes all totals in `Decimal`,
  deducts stock and commits once. The `Idempotency-Key` header is required
  (8–100 chars); replaying it returns the original invoice with `200`.
- Cancellation is Admin-only and restores stock even for products disabled after
  the sale. `unit_cost` appears in Admin sale responses only and never in the
  invoice print payload.
- Reports are Admin-only, exclude `CANCELLED` invoices, use inclusive dates in
  `REPORT_TIMEZONE`, default to the last 30 days and reject ranges over 366
  days. Dashboard series always contain 30 daily points, including zero days.
- Demo data is isolated and repeatable: `python -m scripts.seed_demo` only
  manages `DEMO-*` SKUs and `demo-seed-sale-*` idempotency keys. Set
  `DEMO_CASHIER_PASSWORD` to create a demo cashier; otherwise the first active
  admin is used as the seller.
