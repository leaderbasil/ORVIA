import { forwardRef, useId } from 'react'

import { cn } from '../../utils/cn'

const Input = forwardRef(function Input(
  { label, error, hint, id, className, required = false, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
          {required ? <span className="text-danger-strong"> *</span> : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'h-10 w-full rounded-md border px-3 text-base text-text transition-colors placeholder:text-text-muted/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed',
          // خلفية الحقل تختلف عن البطاقة (bg-gray-50/dark:bg-gray-800) وعن الخلفية الرئيسية (bg-background)
          'bg-white dark:bg-gray-900',
          // حدود أوسع وأكثر وضوحاً لتفصل الحقل عن المحيط
          'border-gray-300 dark:border-gray-600 border-2',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-strong">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default Input
