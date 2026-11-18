import { cn } from '../../utils/cn'

export default function PageHeader({ actions, className }) {
  if (!actions) return null

  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-end gap-2', className)}>
      {actions}
    </div>
  )
}
