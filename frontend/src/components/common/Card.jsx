import { cn } from '../../utils/cn'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}
