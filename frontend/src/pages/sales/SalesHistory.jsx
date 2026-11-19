import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import Input from '../../components/common/Input.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import Select from '../../components/common/Select.jsx'
import { messages } from '../../constants/messages.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useSales } from '../../hooks/useSales.js'
import { getApiErrorMessage } from '../../services/api.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { formatDateTime } from '../../utils/formatDate.js'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all', label: messages.sales.allStatuses },
  { value: 'COMPLETED', label: messages.sales.status.COMPLETED },
  { value: 'CANCELLED', label: messages.sales.status.CANCELLED },
]

const PAYMENT_OPTIONS = [
  { value: 'all', label: messages.sales.allPayments },
  { value: 'CASH', label: messages.sales.payment.CASH },
  { value: 'CARD', label: messages.sales.payment.CARD },
]

export default function SalesHistory() {
  const navigate = useNavigate()

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [paymentMethod, setPaymentMethod] = useState('all')
  const [page, setPage] = useState(1)

  const debouncedInvoice = useDebouncedValue(invoiceNumber, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedInvoice, dateFrom, dateTo, status, paymentMethod])

  const params = useMemo(() => {
    const query = { page, page_size: PAGE_SIZE }
    if (debouncedInvoice.trim()) query.invoice_number = debouncedInvoice.trim()
    if (dateFrom) query.from = dateFrom
    if (dateTo) query.to = dateTo
    if (status !== 'all') query.status = status
    if (paymentMethod !== 'all') query.payment_method = paymentMethod
    return query
  }, [page, debouncedInvoice, dateFrom, dateTo, status, paymentMethod])

  const salesQuery = useSales(params)
  const pageData = salesQuery.data

  const hasActiveFilters =
    Boolean(debouncedInvoice.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    status !== 'all' ||
    paymentMethod !== 'all'

  const resetFilters = () => {
    setInvoiceNumber('')
    setDateFrom('')
    setDateTo('')
    setStatus('all')
    setPaymentMethod('all')
  }

  const columns = [
    {
      key: 'invoice_number',
      header: messages.sales.columns.invoice,
      render: (sale) => (
        <div className="min-w-36">
          <button
            type="button"
            dir="ltr"
            onClick={() => navigate(`/sales/${sale.id}`)}
            className="numeric text-start font-medium text-primary-strong hover:underline"
          >
            {sale.invoice_number}
          </button>
          <p className="text-xs text-text-muted">
            <span className="numeric">{sale.item_count}</span> {messages.sales.itemsCount}
          </p>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: messages.sales.columns.date,
      render: (sale) => (
        <span className="numeric">
          <bdi>{formatDateTime(sale.created_at)}</bdi>
        </span>
      ),
    },
    {
      key: 'cashier',
      header: messages.sales.columns.cashier,
      render: (sale) => sale.cashier?.full_name || messages.common.notAvailable,
    },
    {
      key: 'payment_method',
      header: messages.sales.columns.payment,
      render: (sale) =>
        messages.sales.payment[sale.payment_method] ?? sale.payment_method,
    },
    {
      key: 'total_amount',
      header: messages.sales.columns.total,
      align: 'end',
      className: 'numeric font-semibold',
      render: (sale) => formatMoneyValue(sale.total_amount),
    },
    {
      key: 'status',
      header: messages.sales.columns.status,
      render: (sale) => (
        <Badge tone={sale.status === 'CANCELLED' ? 'danger' : 'success'}>
          {messages.sales.status[sale.status] ?? sale.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: messages.sales.columns.actions,
      align: 'end',
      render: (sale) => (
        <button
          type="button"
          onClick={() => navigate(`/sales/${sale.id}`)}
          aria-label={`${messages.sales.view}: ${sale.invoice_number}`}
          title={messages.sales.view}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
      ),
    },
  ]

  const mobileRow = (sale) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            dir="ltr"
            onClick={() => navigate(`/sales/${sale.id}`)}
            className="numeric text-start font-medium text-primary-strong hover:underline"
          >
            {sale.invoice_number}
          </button>
          <p className="text-xs text-text-muted">
            <span className="numeric">{sale.item_count}</span> {messages.sales.itemsCount}
          </p>
        </div>
        <Badge tone={sale.status === 'CANCELLED' ? 'danger' : 'success'}>
          {messages.sales.status[sale.status] ?? sale.status}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">{messages.sales.columns.date}</dt>
          <dd className="numeric">
            <bdi>{formatDateTime(sale.created_at)}</bdi>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">{messages.sales.columns.cashier}</dt>
          <dd>{sale.cashier?.full_name || messages.common.notAvailable}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">{messages.sales.columns.payment}</dt>
          <dd>{messages.sales.payment[sale.payment_method] ?? sale.payment_method}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">{messages.sales.columns.total}</dt>
          <dd className="numeric font-semibold text-text">
            {formatMoneyValue(sale.total_amount)}
          </dd>
        </div>
      </dl>

      <div className="flex justify-end border-t border-border pt-2">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          {messages.sales.view}
        </Button>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => navigate('/pos')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {messages.actions.newSale}
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label={messages.sales.searchInvoice}
            placeholder={messages.sales.invoicePlaceholder}
            dir="ltr"
            className="numeric text-start"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
          />
          <Input
            label={messages.sales.fromDate}
            type="date"
            max={dateTo || undefined}
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            label={messages.sales.toDate}
            type="date"
            min={dateFrom || undefined}
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <Select
            label={messages.sales.statusFilter}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label={messages.sales.paymentFilter}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            options={PAYMENT_OPTIONS}
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end border-b border-border px-4 py-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {messages.sales.resetFilters}
            </Button>
          </div>
        ) : null}

        {salesQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.errors.UNKNOWN}
              action={
                <Button variant="secondary" size="sm" onClick={() => salesQuery.refetch()}>
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(salesQuery.error)}
            </Alert>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageData?.items ?? []}
            mobileRow={mobileRow}
            isLoading={salesQuery.isLoading}
            emptyTitle={
              hasActiveFilters
                ? messages.sales.emptyFilteredTitle
                : messages.sales.emptyTitle
            }
            emptyDescription={
              hasActiveFilters
                ? messages.sales.emptyFilteredDescription
                : messages.sales.emptyDescription
            }
            emptyAction={
              !hasActiveFilters ? (
                <Button size="sm" onClick={() => navigate('/pos')}>
                  {messages.actions.newSale}
                </Button>
              ) : null
            }
          />
        )}

        {pageData && pageData.total > 0 ? (
          <Pagination
            page={pageData.page}
            pageSize={pageData.page_size}
            total={pageData.total}
            onPageChange={setPage}
            disabled={salesQuery.isFetching}
          />
        ) : null}
      </Card>
    </div>
  )
}
