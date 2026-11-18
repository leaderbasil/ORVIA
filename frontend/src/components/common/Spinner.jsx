import { Loader2 } from 'lucide-react'

import { messages } from '../../constants/messages'
import { cn } from '../../utils/cn'

export default function Spinner({ label = messages.common.loading, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 py-8 text-sm text-text-muted', className)}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
