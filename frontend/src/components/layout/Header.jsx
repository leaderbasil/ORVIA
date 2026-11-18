import { Link, useLocation } from 'react-router-dom'
import { Bell, LogOut, Menu } from 'lucide-react'

import { messages } from '../../constants/messages'
import { cn } from '../../utils/cn'
import { pageMetaForPath } from '../../utils/navigation'

function getInitials(fullName = '') {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
}

export default function Header({ user = null, role = 'ADMIN', onLogout, onOpenSidebar }) {
  const { pathname } = useLocation()
  const page = pageMetaForPath(pathname)

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={messages.aria.openMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-background hover:text-text md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text sm:text-base">{page.title}</p>
          <p className="hidden truncate text-xs text-text-muted sm:block">{page.description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {role === 'ADMIN' ? (
          <Link
            to="/inventory"
            title={messages.actions.lowStockAlert}
            aria-label={messages.actions.lowStockAlert}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}

        {user ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-1 ps-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong"
              aria-hidden="true"
            >
              {getInitials(user.full_name)}
            </span>
            <div className="hidden pe-2 sm:block">
              <p className="text-xs font-medium leading-tight">{user.full_name}</p>
              <p className="text-[11px] text-text-muted">
                {messages.roles[user.role] ?? user.role}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label={messages.actions.logout}
              title={messages.actions.logout}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-text-muted',
                'hover:bg-danger-soft hover:text-danger-strong',
              )}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text transition-colors hover:bg-background"
          >
            {messages.actions.login}
          </Link>
        )}
      </div>
    </header>
  )
}
