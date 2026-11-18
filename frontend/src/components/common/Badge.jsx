import { cn } from '../../utils/cn'

const TONES = {
  primary: 'bg-primary-soft text-primary-strong',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
  neutral: 'border border-border bg-background text-text-muted',
}

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}
