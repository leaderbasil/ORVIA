import { forwardRef, useId } from 'react'

import { cn } from '../../utils/cn'

const Select = forwardRef(function Select(
  { label, error, hint, id, className, options = [], required = false, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id || generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-text">
          {label}
          {required ? <span className="text-danger-strong"> *</span> : null}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 w-full rounded-md border bg-surface px-3 text-base text-text transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-background',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error ? <p className="text-xs text-text-muted">{hint}</p> : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-strong">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default Select
