# ORVIA — Grocery POS & Inventory (MVP)

<p align="center">
  <img src="frontend/public/orvia-icon-180.png" alt="ORVIA" width="120" />
</p>

ORVIA is a lightweight Point of Sale and Inventory Management System designed for a single grocery store. It provides product, pricing, and stock quantity management, fast product search during checkout, multi-item invoices with totals calculated on the server, and automatic inventory deduction within a single database transaction.

The system also includes sales history, basic reports, and role-based access control for Administrators and Cashiers.

Monorepo with two independent apps. The specification in the project brief is
the single source of truth; this repository implements it phase by phase.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 (sync), psycopg 3, PostgreSQL 15+, Alembic, PyJWT, bcrypt |
| Frontend | React 18 + Vite (JSX), React Router v6, Axios, TanStack Query v5, React Hook Form + Zod, Tailwind CSS, Recharts, Vitest + RTL |
| Tooling | Docker Compose, pytest + HTTPX, ESLint |

## Repository layout

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # app factory, CORS, error handlers, /health
│   │   ├── dependencies.py      # get_db, pagination params
│   │   ├── core/                # config, security, permissions, exceptions
│   │   ├── db/                  # session, declarative base, first-admin seed
│   │   ├── models/              # users, products, sales, sale_items
│   │   ├── schemas/             # Pydantic request/response contracts
│   │   ├── services/            # business logic + queries + commit/rollback
│   │   ├── routers/             # thin HTTP layer (auth, users, products, sales, reports)
│   │   └── utils/               # money helpers (Decimal, ROUND_HALF_UP), pagination
│   ├── alembic/versions/        # 0001_initial_schema (tables, enum, sequence)
│   ├── tests/                   # pytest (real PostgreSQL)
│   ├── scripts/                 # repeatable demo dataset (scripts/seed_demo.py)
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/{brand,common,layout,products,pos,invoices}
│   │   ├── pages/{auth,dashboard,products,pos,sales,inventory,users}
│   │   ├── services/api.js      # single Axios instance + interceptors
│   │   ├── hooks/               # TanStack Query hooks + useAuth
│   │   ├── context/             # AuthContext provider
│   │   ├── routes/AppRoutes.jsx # route table + ProtectedRoute
│   │   ├── constants/messages.js  # every Arabic UI string
│   │   ├── utils/               # money (integer cents), currency, dates, cn
│   │   └── styles/globals.css
│   ├── tailwind.config.js       # design tokens (Linear-inspired system)
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── docs/
│   ├── requirements.md
│   ├── database-erd.md
│   └── api-contract.md
├── docker-compose.yml
└── README.md
```

No repository layer anywhere: React Page → Hook → API service → FastAPI Router
→ Schema + Dependencies → Service → SQLAlchemy → PostgreSQL.

## Quick start

### Docker Compose (PostgreSQL + API + web)

```bash
docker compose up --build
```

- Web: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Default admin: `admin@example.com` / `change-me-now` — change it immediately.

The backend waits for the database healthcheck, runs `alembic upgrade head`,
seeds the first admin, then starts Uvicorn.

### Manual

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # set DATABASE_URL + a long JWT_SECRET_KEY
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Demo data

The demo script is repeatable and only touches its own `DEMO-*` products and
`demo-seed-sale-*` invoices:

```bash
cd backend
# optional: export DEMO_CASHIER_PASSWORD='choose-a-demo-password'
python -m scripts.seed_demo
```

It creates eight Arabic-named products (including one low-stock and one
out-of-stock item), 30 invoices spread over the last 30 days (three cancelled),
and uses the first active admin as the seller unless a demo cashier already
exists.

### Showcase demo login

The login page can show a one-click **الدخول بالنسخة التجريبية** button. It is
hidden by default and appears only when all three variables are set in
`frontend/.env`:

```env
VITE_DEMO_LOGIN_ENABLED=true
VITE_DEMO_ADMIN_EMAIL=admin@example.com
VITE_DEMO_ADMIN_PASSWORD=change-me-now
```

The button calls the normal `/auth/login` endpoint with those credentials; there
is no backend bypass. Vite compiles these values into the public bundle, so this
is for local showcases only. Use a dedicated demo account and keep
`VITE_DEMO_LOGIN_ENABLED=false` in production.

For Docker Compose, enable it at startup instead:

```bash
VITE_DEMO_LOGIN_ENABLED=true docker compose up --build
```

## Tests

```bash
cd backend && pytest            # needs PostgreSQL (mini_grocery_pos_test)
cd frontend && npm test         # Vitest + React Testing Library
```

Current suite: 61 backend tests (including a two-connection stock-lock test)
and 21 frontend tests.

Backend tests intentionally use real PostgreSQL: row locks (`FOR UPDATE`) and
CHECK constraints cannot be simulated on SQLite. The suite includes a
two-connection concurrency test for stock deduction.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: settings, DB session, 4 models, initial migration (enum + sequence), error envelope, CORS, health, RTL frontend shell, design tokens, Axios client | ✅ complete |
| 2 | Auth/JWT, permissions, users, products, search, low stock, login + product/user/inventory UI | ✅ complete |
| 3 | Sales service (locks, Decimal totals, idempotency, cancellation), invoices, POS UI | ✅ complete |
| 4 | Reports, dashboard, demo data, hardening, full docs | ✅ complete |

## Architecture and safety rules

- Money: `Decimal` in Python, `NUMERIC(12,2)` in PostgreSQL. Floats are
  rejected. JSON money values are strings (`"12.50"`).
- The server never trusts client prices or totals; it reads prices, computes
  totals, and commits the sale + stock deduction in one transaction.
- Router → Service → Model with Pydantic schemas; routers contain no business
  logic or queries; services own `commit()` / `rollback()`.
- Synchronous SQLAlchemy 2 (`select()` style) with psycopg 3; endpoints defined
  with `def`.
- Roles are enforced with backend dependencies. UI hiding is cosmetic.
- Every schema change is an Alembic migration (no `create_all()`).
- 401 clears the session and redirects to `/login`; cashiers get 404 for other
  cashiers' invoices (existence is not leaked).
- Secrets come from environment variables only. `.env` is ignored; only
  `.env.example` is committed.

## Assumptions recorded during implementation

1. A disabled user with a still-valid JWT receives `401 TOKEN_INVALID`
   (spec §6), while a disabled user attempting login receives
   `403 USER_INACTIVE` (spec error table).
2. The invoice sequence is global and never reset yearly; gaps are accepted.
3. Sales/POS, sales history, invoice details, the Admin dashboard and the
   reports screen are fully wired. Admin-only screens are lazy-loaded so the
   Recharts bundle is not downloaded for cashiers.
4. `barcode = ""` is normalised to `NULL` before validation to keep the unique
   constraint usable.
5. Backend tests force `DATABASE_URL` to an isolated database whose name ends in
   `_test`. Override with `TEST_DATABASE_URL`; the suite refuses to run against
   other database names.
6. Sale/invoice payloads expose `unit_cost` to Admin responses only; cashiers
   and invoice print payloads never receive cost data. History and report dates
   are inclusive in `REPORT_TIMEZONE`, and a cashier never sees another
   cashier's invoice (404).

## Acceptance checklist (final)

- Auth: login, password hashing, valid tokens on protected routes, roles
  enforced server-side.
- Products/inventory: admin CRUD + disable, unique SKU/barcode, search, low
  stock, stock never negative.
- POS/sales: multi-item invoice, server totals, unique invoice number,
  automatic stock deduction, insufficient-stock rejection, full rollback,
  idempotent replay, cancellation restores stock once.
- Reports/UI: dashboard, history + details, top products, low stock,
  loading/empty/error states.
- Quality: backend + frontend tests, concurrency test, migrations,
  `.env.example`, clear README, ERD + API docs, clean-environment run.

## Documentation

- [Requirements](docs/requirements.md)
- [Database ERD](docs/database-erd.md)
- [API contract](docs/api-contract.md)
