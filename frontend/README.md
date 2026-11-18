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

## Demo login (showcase only)

Set the following in `frontend/.env` to show a one-click demo login button on
the login page:

```env
VITE_DEMO_LOGIN_ENABLED=true
VITE_DEMO_ADMIN_EMAIL=admin@example.com
VITE_DEMO_ADMIN_PASSWORD=change-me-now
```

The button is hidden unless the flag is `true` and both credentials are present.
It uses the normal login API, so the account must exist in the backend. These
values are embedded in the client bundle; never enable this for a production
deployment or with a real admin password.

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
