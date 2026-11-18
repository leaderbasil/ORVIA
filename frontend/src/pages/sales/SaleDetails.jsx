import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Printer, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import { messages } from '../../constants/messages.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useCancelSale, useSale } from '../../hooks/useSales.js'
import { getApiErrorMessage } from '../../services/api.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { formatDateTime } from '../../utils/formatDate.js'

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="numeric font-medium text-text">{children}</dd>
    </div>
  )
}

export default function SaleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const saleQuery = useSale(id)
  const cancelSale = useCancelSale()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const sale = saleQuery.data

  const breadcrumbs = (
    <div className="no-print">
      <Breadcrumbs
        items={[
          { label: messages.nav.sales, to: '/sales' },
          { label: sale?.invoice_number ?? messages.pages.saleDetails.title },
        ]}
      />
    </div>
  )

  const handleCancel = async () => {
    if (!sale) return
    try {
      await cancelSale.mutateAsync(sale.id)
      toast.success(messages.sales.cancelled)
      setConfirmOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (saleQuery.isLoading) {
    return (
      <div>
        {breadcrumbs}
        <Spinner />
      </div>
    )
  }

  if (saleQuery.isError) {
    return (
      <div>
        {breadcrumbs}
        <Alert
          tone="danger"
          title={messages.sales.errorTitle}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => saleQuery.refetch()}>
                {messages.common.retry}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
                {messages.sales.back}
              </Button>
            </div>
          }
        >
          {getApiErrorMessage(saleQuery.error)}
        </Alert>
      </div>
    )
  }

  if (!sale) return null

  return (
    <div>
      {breadcrumbs}

      <PageHeader
        className="no-print"
        title={`${messages.sales.detailTitle} ${sale.invoice_number}`}
        description={`${messages.sales.issuedAt}: ${formatDateTime(sale.created_at)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/sales')}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {messages.sales.back}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              {messages.actions.print}
            </Button>
            {isAdmin && sale.status === 'COMPLETED' ? (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {messages.actions.cancelSale}
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="print-area p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text">{messages.app.name}</p>
            <p className="text-sm text-text-muted">{messages.app.tagline}</p>
          </div>
          <div className="space-y-1 text-end">
            <p className="text-xs text-text-muted">{messages.pos.invoiceNumber}</p>
            <p dir="ltr" className="numeric text-lg font-semibold text-text">
              {sale.invoice_number}
            </p>
            <Badge tone={sale.status === 'CANCELLED' ? 'danger' : 'success'}>
              {messages.sales.status[sale.status] ?? sale.status}
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 border-b border-border py-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-muted">{messages.sales.seller}</dt>
            <dd className="font-medium text-text">{sale.cashier?.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">{messages.sales.paymentMethod}</dt>
            <dd className="font-medium text-text">
              {messages.sales.payment[sale.payment_method] ?? sale.payment_method}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">{messages.sales.issuedAt}</dt>
            <dd className="numeric font-medium text-text">
              {formatDateTime(sale.created_at)}
            </dd>
          </div>
        </dl>

        {sale.status === 'CANCELLED' ? (
          <div className="pt-4">
            <Alert tone="danger">{messages.sales.cancelledNotice}</Alert>
          </div>
        ) : null}

        <div className="overflow-x-auto pt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-border bg-background">
                <th scope="col" className="px-3 py-2 text-start font-medium text-text-muted">
                  {messages.sales.product}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-start font-medium text-text-muted"
                >
                  {messages.sales.sku}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-end font-medium text-text-muted"
                >
                  {messages.sales.quantity}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-end font-medium text-text-muted"
                >
                  {messages.sales.unitPrice}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-end font-medium text-text-muted"
                >
                  {messages.sales.lineTotal}
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.product_id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium text-text">{item.product_name}</td>
                  <td className="numeric px-3 py-2 text-text-muted">{item.sku}</td>
                  <td className="numeric px-3 py-2 text-end">{item.quantity}</td>
                  <td className="numeric px-3 py-2 text-end">
                    {formatMoneyValue(item.unit_price)}
                  </td>
                  <td className="numeric px-3 py-2 text-end font-medium">
                    {formatMoneyValue(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <DetailRow label={messages.sales.subtotal}>
              {formatMoneyValue(sale.subtotal)}
            </DetailRow>
            <DetailRow label={messages.sales.discount}>
              −{formatMoneyValue(sale.discount_amount)}
            </DetailRow>
            <DetailRow label={messages.sales.tax}>
              {formatMoneyValue(sale.tax_amount)}
            </DetailRow>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <dt className="font-semibold text-text">{messages.sales.total}</dt>
              <dd className="numeric text-lg font-semibold text-text">
                {formatMoneyValue(sale.total_amount)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="no-print mt-6 text-center text-xs text-text-muted">
          {messages.sales.printHint}
        </p>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={messages.sales.cancelConfirmTitle}
        description={messages.sales.cancelConfirmDescription}
        confirmLabel={messages.sales.cancelCta}
        loading={cancelSale.isPending}
        onConfirm={handleCancel}
        onClose={() => {
          if (!cancelSale.isPending) setConfirmOpen(false)
        }}
      />
    </div>
  )
}
