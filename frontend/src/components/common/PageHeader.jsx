import { cn } from '../../utils/cn'

export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
