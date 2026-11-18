import { messages } from '../../constants/messages'
import { cn } from '../../utils/cn'
import EmptyState from './EmptyState'

function SkeletonRows({ columns, rows }) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`} className="h-12 border-b border-border last:border-0">
      {columns.map((column) => (
        <td key={column.key} className="px-3 py-2">
          <span className="block h-3.5 w-full max-w-24 animate-pulse rounded bg-background" />
        </td>
      ))}
    </tr>
  ))
}

export default function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  isLoading = false,
  loadingRows = 5,
  emptyTitle = messages.common.empty,
  emptyDescription,
  emptyAction,
  className,
}) {
  const isEmpty = !isLoading && rows.length === 0

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-11 whitespace-nowrap px-3 text-start text-xs font-medium text-text-muted',
                  column.align === 'end' && 'text-end',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows columns={columns} rows={loadingRows} />
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="h-12 border-b border-border transition-colors last:border-0 hover:bg-primary-soft/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'whitespace-nowrap px-3 py-2 align-middle',
                      column.align === 'end' && 'text-end',
                      column.className,
                    )}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
