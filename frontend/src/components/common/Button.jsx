import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '../../utils/cn'

const VARIANTS = {
  primary:
    'bg-primary-strong text-white hover:bg-primary-hover disabled:hover:bg-primary-strong',
  secondary:
    'border border-border bg-surface text-text hover:bg-background disabled:hover:bg-surface',
  ghost:
    'bg-transparent text-text-muted hover:bg-primary-soft hover:text-primary-strong',
  danger: 'bg-danger text-white hover:bg-danger-strong disabled:hover:bg-danger',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-[52px] px-6 text-base',
}

const Button = forwardRef(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
})

export default Button
