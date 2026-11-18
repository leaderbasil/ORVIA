import { useMemo, useState } from 'react'
import { BarChart3, Boxes, ReceiptText, TrendingUp, Wallet } from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import Input from '../../components/common/Input.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Select from '../../components/common/Select.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import SalesChart from '../../components/reports/SalesChart.jsx'
import StatCard from '../../components/reports/StatCard.jsx'
import { messages } from '../../constants/messages.js'
import {
  useInventoryReport,
  useSalesReport,
  useTopProducts,
} from '../../hooks/useReports.js'
import { getApiErrorMessage } from '../../services/api.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { toDateInputValue } from '../../utils/formatDate.js'
import { toCents } from '../../utils/money.js'

function lastThirtyDays() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  }
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold text-text">{value}</p>
    </div>
  )
}

export default function Reports() {
  const initialRange = useMemo(() => lastThirtyDays(), [])
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [groupBy, setGroupBy] = useState('day')

  const salesParams = useMemo(
    () => {
      const params = { group_by: groupBy }
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      return params
    },
    [dateFrom, dateTo, groupBy],
  )
  const topProductParams = useMemo(() => {
    const params = { limit: 10 }
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    return params
  }, [dateFrom, dateTo])

  const salesQuery = useSalesReport(salesParams)
  const topProductsQuery = useTopProducts(topProductParams)
  const inventoryQuery = useInventoryReport()

  const summary = salesQuery.data?.summary
  const inventory = inventoryQuery.data

  const chartData = useMemo(
    () =>
      (salesQuery.data?.series ?? []).map((point) => ({
        ...point,
        salesCents: toCents(point.sales_total),
      })),
    [salesQuery.data],
  )

  const topProductColumns = [
    {
      key: 'product',
      header: messages.reports.columns.product,
      render: (row) => (
        <div className="min-w-40">
          <p className="font-medium text-text">{row.product_name}</p>
          <p className="numeric text-xs text-text-muted">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: messages.reports.columns.quantity,
      align: 'end',
      render: (row) => <span className="numeric">{row.quantity_sold}</span>,
    },
    {
      key: 'revenue',
      header: messages.reports.columns.revenue,
      align: 'end',
      render: (row) => (
        <span className="numeric font-medium text-text">
          {formatMoneyValue(row.revenue)}
        </span>
      ),
    },
  ]

  const lowStockColumns = [
    {
      key: 'product',
      header: messages.reports.columns.product,
      render: (row) => (
        <div className="min-w-44">
          <p className="font-medium text-text">{row.name}</p>
          <p className="numeric text-xs text-text-muted">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: messages.reports.columns.category,
      render: (row) => row.category || messages.common.notAvailable,
    },
    {
      key: 'stock',
      header: messages.reports.columns.stock,
      align: 'end',
      render: (row) => (
        <span
          className={
            row.stock_quantity === 0
              ? 'numeric font-semibold text-danger-strong'
              : 'numeric font-medium text-text'
          }
        >
          {row.stock_quantity}
        </span>
      ),
    },
    {
      key: 'minimum',
      header: messages.reports.columns.minimum,
      align: 'end',
      render: (row) => <span className="numeric">{row.minimum_stock}</span>,
    },
    {
      key: 'value',
      header: messages.reports.columns.value,
      align: 'end',
      render: (row) => (
        <span className="numeric">{formatMoneyValue(row.value_at_cost)}</span>
      ),
    },
  ]

  const resetRange = () => {
    const range = lastThirtyDays()
    setDateFrom(range.from)
    setDateTo(range.to)
    setGroupBy('day')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={messages.pages.reports.title}
        description={messages.pages.reports.description}
      />

      <Card>
        <div className="border-b border-border p-4">
          <h2 className="text-base font-semibold text-text">
            {messages.reports.filtersTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="date"
            label={messages.reports.from}
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            type="date"
            label={messages.reports.to}
            value={dateTo}
            min={dateFrom}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <Select
            label={messages.reports.groupBy}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
            options={[
              { value: 'day', label: messages.reports.day },
              { value: 'month', label: messages.reports.month },
            ]}
          />
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={resetRange}>
              {messages.reports.resetFilters}
            </Button>
          </div>
        </div>
      </Card>

      {salesQuery.isError ? (
        <Alert
          tone="danger"
          title={messages.reports.errorTitle}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => salesQuery.refetch()}
            >
              {messages.common.retry}
            </Button>
          }
        >
          {getApiErrorMessage(salesQuery.error)}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={messages.reports.salesTotal}
          value={summary ? formatMoneyValue(summary.sales_total) : messages.common.notAvailable}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          title={messages.reports.invoiceCount}
          value={summary ? summary.invoice_count : messages.common.notAvailable}
          icon={ReceiptText}
          tone="primary"
        />
        <StatCard
          title={messages.reports.averageInvoice}
          value={summary ? formatMoneyValue(summary.average_invoice) : messages.common.notAvailable}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          title={messages.reports.totalDiscount}
          value={summary ? formatMoneyValue(summary.total_discount) : messages.common.notAvailable}
          icon={BarChart3}
          tone="warning"
        />
      </div>

      <Card>
        <div className="border-b border-border p-4">
          <h2 className="text-base font-semibold text-text">
            {messages.reports.salesTrend}
          </h2>
          <p className="text-sm text-text-muted">
            {messages.reports.salesTrendDescription}
          </p>
        </div>
        <div className="p-4">
          {salesQuery.isLoading ? (
            <Spinner />
          ) : salesQuery.isError ? (
            <p className="py-8 text-center text-sm text-text-muted">
              {messages.reports.seriesUnavailable}
            </p>
          ) : (
            <SalesChart
              data={chartData}
              type="bar"
              ariaLabel={messages.reports.salesTrend}
            />
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border p-4">
          <h2 className="text-base font-semibold text-text">
            {messages.reports.topProducts}
          </h2>
          <p className="text-sm text-text-muted">
            {messages.reports.topProductsDescription}
          </p>
        </div>
        {topProductsQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.reports.errorTitle}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => topProductsQuery.refetch()}
                >
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(topProductsQuery.error)}
            </Alert>
          </div>
        ) : (
          <DataTable
            columns={topProductColumns}
            rows={topProductsQuery.data ?? []}
            rowKey={(row) => row.product_id}
            isLoading={topProductsQuery.isLoading}
            emptyTitle={messages.reports.noTopProducts}
            emptyDescription={messages.reports.noTopProductsDescription}
          />
        )}
      </Card>

      <Card>
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <Boxes className="h-5 w-5 text-text-muted" aria-hidden="true" />
            {messages.reports.inventory}
          </h2>
          <p className="text-sm text-text-muted">
            {messages.reports.inventoryDescription}
          </p>
        </div>

        {inventoryQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.reports.errorTitle}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => inventoryQuery.refetch()}
                >
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(inventoryQuery.error)}
            </Alert>
          </div>
        ) : inventoryQuery.isLoading || !inventory ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-5">
              <Metric
                label={messages.reports.totalProducts}
                value={inventory.total_products}
              />
              <Metric
                label={messages.reports.activeProducts}
                value={inventory.active_products}
              />
              <Metric
                label={messages.reports.outOfStock}
                value={inventory.out_of_stock}
              />
              <Metric
                label={messages.reports.lowStock}
                value={inventory.low_stock}
              />
              <Metric
                label={messages.reports.stockValue}
                value={formatMoneyValue(inventory.stock_value_at_cost)}
              />
            </div>
            <div className="border-t border-border">
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold text-text">
                  {messages.reports.lowStockItems}
                </h3>
              </div>
              <DataTable
                columns={lowStockColumns}
                rows={inventory.low_stock_items}
                rowKey={(row) => row.product_id}
                emptyTitle={messages.reports.noLowStock}
                emptyDescription={messages.reports.noLowStockDescription}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
