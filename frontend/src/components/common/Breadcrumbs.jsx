import { Link } from 'react-router-dom'

import { messages } from '../../constants/messages'

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label={messages.aria.breadcrumb} className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.to && !isLast ? (
                <Link to={item.to} className="transition-colors hover:text-primary-strong">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-text' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-text-muted/60">
                  /
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
