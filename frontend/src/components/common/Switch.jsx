import { useId } from 'react'

import { cn } from '../../utils/cn'

export default function Switch({
  checked = false,
  onChange,
  label,
  hint,
  disabled = false,
  id,
}) {
  const generatedId = useId()
  const switchId = id || generatedId
  const hintId = `${switchId}-hint`

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={switchId}
          role="switch"
          aria-checked={checked}
          aria-describedby={hint ? hintId : undefined}
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          className={cn(
            'inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            checked
              ? 'justify-end border-primary-strong bg-primary-strong'
              : 'justify-start border-border bg-background',
          )}
        >
          <span className="inline-block h-4 w-4 rounded-full bg-surface shadow-sm" />
        </button>
        {label ? (
          <label htmlFor={switchId} className="text-sm font-medium text-text">
            {label}
          </label>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
