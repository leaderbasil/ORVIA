import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

import { messages } from '../../constants/messages'
import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={messages.actions.close}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-text/40"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-xl border border-border bg-surface p-4 shadow-md focus:outline-none sm:p-6',
          SIZES[size] ?? SIZES.md,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? (
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
            ) : null}
            {description ? <p className="text-sm text-text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.actions.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div>{children}</div>

        {footer ? <div className="mt-6 flex justify-start gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
