import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { messages } from '../../constants/messages'
import { formatMoneyFromCents } from '../../utils/currency'

function formatPeriodLabel(period) {
  if (!period) return ''
  return period.length === 7 ? period : period.slice(5)
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div
      dir="rtl"
      className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md"
    >
      <p className="mb-1 font-medium text-text">{point.period}</p>
      <p className="text-text-muted">
        {messages.dashboard.revenue}:{' '}
        <span className="numeric font-medium text-text">
          {formatMoneyFromCents(point.salesCents)}
        </span>
      </p>
      <p className="text-text-muted">
        {messages.reports.invoiceCount}:{' '}
        <span className="numeric font-medium text-text">{point.invoice_count}</span>
      </p>
    </div>
  )
}

export default function SalesChart({
  data = [],
  type = 'area',
  ariaLabel = messages.dashboard.dailySales,
  className,
}) {
  const commonProps = {
    data,
    margin: { top: 8, right: 8, left: 0, bottom: 0 },
  }

  const axes = (
    <>
      <CartesianGrid
        stroke="var(--chart-grid)"
        strokeDasharray="3 3"
        vertical={false}
      />
      <XAxis
        dataKey="period"
        tickFormatter={formatPeriodLabel}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        minTickGap={24}
      />
      <YAxis
        tickFormatter={formatMoneyFromCents}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={78}
        domain={[0, (dataMax) => (dataMax > 0 ? dataMax : 100)]}
      />
      <Tooltip
        content={<ChartTooltip />}
        cursor={
          type === 'bar'
            ? { fill: 'var(--chart-grid)', opacity: 0.35 }
            : { stroke: 'var(--chart-grid)' }
        }
      />
    </>
  )

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart {...commonProps}>
              {axes}
              <Bar
                dataKey="salesCents"
                fill="var(--chart-primary)"
                maxBarSize={36}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart {...commonProps}>
              {axes}
              <Area
                type="monotone"
                dataKey="salesCents"
                stroke="var(--chart-primary)"
                strokeWidth={2}
                fill="var(--chart-primary)"
                fillOpacity={0.12}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
