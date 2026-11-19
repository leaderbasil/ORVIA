import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'

import { OrviaMark } from '../brand/OrviaLogo'
import { APP_NAME, messages } from '../../constants/messages'
import { cn } from '../../utils/cn'

const NAV_ITEMS = [
  { to: '/', label: messages.nav.dashboard, icon: LayoutDashboard, roles: ['ADMIN'], end: true },
  { to: '/pos', label: messages.nav.pos, icon: ShoppingCart, roles: ['ADMIN', 'CASHIER'] },
  { to: '/products', label: messages.nav.products, icon: Package, roles: ['ADMIN', 'CASHIER'] },
  { to: '/sales', label: messages.nav.sales, icon: ReceiptText, roles: ['ADMIN', 'CASHIER'] },
  { to: '/inventory', label: messages.nav.inventory, icon: Boxes, roles: ['ADMIN'] },
  { to: '/reports', label: messages.nav.reports, icon: BarChart3, roles: ['ADMIN'] },
  { to: '/users', label: messages.nav.users, icon: Users, roles: ['ADMIN'] },
]

function SidebarContent({
  role,
  onNavigate,
  showClose = false,
  onClose,
  showBrand = false,
  showLabels = false,
}) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <OrviaMark className="h-9 w-9 shrink-0 rounded-lg" />
          <div className={cn('min-w-0', showBrand ? 'block' : 'hidden lg:block')}>
            <p className="text-sm font-semibold leading-tight tracking-[0.08em]">{APP_NAME}</p>
            <p className="truncate text-xs text-text-muted">{messages.app.tagline}</p>
          </div>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.aria.closeMenu}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-background hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label={messages.aria.mainNavigation}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                  showLabels ? 'justify-start' : 'justify-center lg:justify-start',
                  isActive
                    ? 'bg-primary-soft text-primary-strong'
                    : 'text-text-muted hover:bg-background hover:text-text',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={showLabels ? 'inline' : 'hidden lg:inline'}>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="hidden border-t border-border p-3 text-center text-xs text-text-muted lg:block">
        {APP_NAME} · {messages.app.version}
      </div>
    </>
  )
}

export default function Sidebar({ role = 'ADMIN', open = false, onClose }) {
  return (
    <>
      {/* Desktop / tablet rail (tablet shows icons only, desktop shows labels). */}
      <aside className="no-print sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col border-e border-border bg-surface md:flex lg:w-64">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={messages.aria.closeMenu}
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-text/40"
          />
          <aside className="absolute inset-y-0 start-0 flex w-64 flex-col border-e border-border bg-surface shadow-md">
            <SidebarContent
              role={role}
              onNavigate={onClose}
              showClose
              onClose={onClose}
              showBrand
              showLabels
            />
          </aside>
        </div>
      ) : null}
    </>
  )
}
