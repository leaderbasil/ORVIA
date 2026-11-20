import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

import { cn } from '../../utils/cn'

const TONES = {
  danger: {
    wrapper: 'border-danger/30 bg-danger-soft text-danger-strong dark:border-danger/50 dark:bg-danger/10 dark:text-danger-strong',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'border-success/30 bg-success-soft text-success-strong dark:border-success/50 dark:bg-success/10 dark:text-success-strong',
    icon: CheckCircle2,
  },
  warning: {
    wrapper: 'border-warning/30 bg-warning-soft text-warning-strong dark:border-warning/50 dark:bg-warning/10 dark:text-warning-strong',
    icon: AlertTriangle,
  },
  info: {
    wrapper: 'border-border bg-background text-text-muted dark:border-border dark:bg-surface dark:text-text-muted',
    icon: Info,
  },
}

export default function Alert({ tone = 'danger', title, children, action, className }) {
  const config = TONES[tone] ?? TONES.info
  const Icon = config.icon

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
        config.wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
