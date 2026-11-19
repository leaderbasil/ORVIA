# Frontend — ORVIA

React 18 + Vite (JSX) + Tailwind CSS + TanStack Query + React Router v6.
Arabic RTL interface, light theme only.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

Scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`.

## Demo login (frontend-only)

The login page shows a one-click **الدخول بالنسخة التجريبية** button by default.
The demo needs no FastAPI or PostgreSQL: products, users and invoices are seeded
into `localStorage` under `orvia.demo.v2.*`, and the demo session uses a local
token. All pages and actions (dashboard, products, inventory, POS checkout,
sales, reports and users) run in the browser.

```env
VITE_DEMO_LOGIN_ENABLED=true
VITE_DEMO_ADMIN_EMAIL=demo@orvia.local
VITE_DEMO_ADMIN_PASSWORD=orvia-demo
```

The values above are fallbacks. Override them in `frontend/.env` if needed; the
button never calls the login API. Set `VITE_DEMO_LOGIN_ENABLED=false` when the
frontend is connected to a real backend so the local demo button stays hidden.
To start again from the seeded products and invoices, clear the site's local
storage in the browser.

## Layout

```
src/
  main.jsx, App.jsx
  components/common/   design-system primitives (Button, Input, Card, Badge, ...)
  components/layout/   Sidebar, Header, AppLayout (RTL shell)
  components/reports/  StatCard, SalesChart (Recharts)
  pages/               one folder per feature
  routes/AppRoutes.jsx route table
  services/api.js      single Axios instance + interceptors + error helpers
  utils/               money (integer cents), currency, dates, cn
  constants/messages.js  all Arabic UI strings + API error messages
  styles/globals.css   Tailwind entry + print styles
```

## Design system

Tokens live in `tailwind.config.js` only (colors `background`, `surface`,
`border`, `text`, `primary`, `success`, `warning`, `danger`; radii; shadows;
font family `IBM Plex Sans Arabic`). Components never hard-code hex colors.
Use logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`,
`text-start`) so the RTL layout stays correct. Chart colors use CSS variables
derived from the same Tailwind tokens (`--chart-primary`, `--chart-grid`,
`--chart-axis`); no component hard-codes chart hex colors.

## Implementation status (phase 4)

- Real login with JWT, session restore via `/auth/me`, logout, 401 handling.
- `AuthProvider` + `useAuth`, `ProtectedRoute` with role guards and a 403 page.
- Products: paginated table, search/category/status filters, sorting, create,
  edit, soft disable, role-aware cost column.
- Users (Admin): filters, create/edit modals, activation toggle, self guards.
- Inventory (Admin): low-stock table with links to edit stock.
- POS: debounced product search, stock-aware cart, integer-cent preview,
  discount/payment controls, idempotent checkout, success dialog.
- Sales: history with date/status/payment/invoice filters and pagination;
  invoice details, browser printing and Admin-only cancellation.
- Dashboard (Admin): today/30-day cards, low-stock alert, daily sales area
  chart, top products and a link to reports.
- Reports (Admin): date/group-by filters, sales summary and bar chart, top
  products table, inventory value and low-stock table.
- Route pages are lazy-loaded; the Recharts bundle loads only for the Admin
  dashboard/reports.
- Shared UI: `DataTable`, `Pagination`, `Modal`, `ConfirmDialog`, `Select`,
  `Switch`, `Breadcrumbs`, `Alert`, `StatCard`, `SalesChart`.
- Tests: money/cart utilities, idempotency keys, login validation/errors/session,
  protected routing.
