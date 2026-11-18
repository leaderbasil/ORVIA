import { ChevronLeft, ChevronRight } from 'lucide-react'

import { messages } from '../../constants/messages'
import Button from './Button'

export default function Pagination({ page, pageSize, total, onPageChange, disabled = false }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3">
      <p className="text-xs text-text-muted">
        {messages.common.page} <span className="numeric">{page}</span> {messages.common.of}{' '}
        <span className="numeric">{totalPages}</span>
        <span className="px-1">·</span>
        <span className="numeric">{total}</span> {messages.common.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={messages.common.previous}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          {messages.common.previous}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={messages.common.next}
        >
          {messages.common.next}
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
