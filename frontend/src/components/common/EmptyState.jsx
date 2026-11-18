import { Inbox } from 'lucide-react'

import { cn } from '../../utils/cn'

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-text-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-base font-medium text-text">{title}</p>
      {description ? <p className="max-w-md text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
