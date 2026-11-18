import { cn } from '../../utils/cn'
import Card from '../common/Card'

const TONES = {
  primary: 'bg-primary-soft text-primary-strong',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
}

export default function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  className,
}) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-text-muted">{title}</p>
          <p className="numeric truncate text-2xl font-semibold text-text">{value}</p>
          {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
              TONES[tone] ?? TONES.primary,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </Card>
  )
}
