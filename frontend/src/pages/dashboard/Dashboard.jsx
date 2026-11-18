import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import SalesChart from '../../components/reports/SalesChart.jsx'
import StatCard from '../../components/reports/StatCard.jsx'
import { messages } from '../../constants/messages.js'
import { useDashboard } from '../../hooks/useReports.js'
import { getApiErrorMessage } from '../../services/api.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { formatDate } from '../../utils/formatDate.js'
import { toCents } from '../../utils/money.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const dashboardQuery = useDashboard()
  const data = dashboardQuery.data

  const chartData = useMemo(
    () =>
      (data?.daily_sales ?? []).map((point) => ({
        ...point,
        salesCents: toCents(point.sales_total),
      })),
    [data],
  )

  if (dashboardQuery.isLoading) {
    return <Spinner />
  }

  if (dashboardQuery.isError) {
    return (
      <div>
        <Alert
          tone="danger"
          title={messages.dashboard.errorTitle}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dashboardQuery.refetch()}
            >
              {messages.common.retry}
            </Button>
          }
        >
          {getApiErrorMessage(dashboardQuery.error)}
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate('/reports')}>
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {messages.dashboard.viewReports}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={messages.dashboard.todaySales}
          value={formatMoneyValue(data.today.sales_total)}
          icon={Banknote}
          tone="primary"
        />
        <StatCard
          title={messages.dashboard.todayInvoices}
          value={data.today.invoice_count}
          icon={ReceiptText}
          tone="primary"
        />
        <StatCard
          title={messages.dashboard.periodSales}
          value={formatMoneyValue(data.period.sales_total)}
          hint={`${formatDate(data.period.from)} – ${formatDate(data.period.to)}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          title={messages.dashboard.grossProfit}
          value={formatMoneyValue(data.period.gross_profit)}
          hint={messages.dashboard.periodLabel}
          icon={Wallet}
          tone="success"
        />
      </div>

      {data.low_stock_count > 0 ? (
        <Alert
          tone="warning"
          title={messages.dashboard.lowStockTitle}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/inventory')}
            >
              {messages.dashboard.lowStockAction}
            </Button>
          }
        >
          <span className="numeric font-semibold">{data.low_stock_count}</span>{' '}
          {messages.dashboard.lowStockMessage}
        </Alert>
      ) : (
        <Alert tone="success" title={messages.dashboard.lowStockTitle}>
          {messages.dashboard.lowStockGood}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold text-text">
              {messages.dashboard.dailySales}
            </h2>
            <p className="text-sm text-text-muted">
              {messages.dashboard.dailySalesDescription}
            </p>
          </div>
          <div className="p-4">
            <SalesChart data={chartData} type="area" />
          </div>
        </Card>

        <Card>
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold text-text">
              {messages.dashboard.topProducts}
            </h2>
            <p className="text-sm text-text-muted">
              {messages.dashboard.topProductsDescription}
            </p>
          </div>

          {data.top_products.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={messages.dashboard.noTopProducts}
              description={messages.dashboard.noTopProductsDescription}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.top_products.map((product, index) => (
                <li
                  key={`${product.product_id}-${product.sku}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="numeric flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {product.product_name}
                    </p>
                    <p className="numeric truncate text-xs text-text-muted">
                      {product.sku}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="numeric text-sm font-semibold text-text">
                      {product.quantity_sold}
                    </p>
                    <p className="text-xs text-text-muted">
                      {messages.dashboard.quantitySold}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="numeric text-sm font-semibold text-text">
                      {formatMoneyValue(product.revenue)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {messages.dashboard.revenue}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
