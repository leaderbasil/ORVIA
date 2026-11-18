import { useNavigate } from 'react-router-dom'

import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import { messages } from '../../constants/messages.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { formatDateTime } from '../../utils/formatDate.js'

export default function SaleSuccessDialog({ sale, onClose }) {
  const navigate = useNavigate()

  return (
    <Modal
      open={Boolean(sale)}
      onClose={onClose}
      title={messages.pos.saleSuccessTitle}
      description={messages.pos.saleSuccessDescription}
      size="sm"
      footer={
        sale ? (
          <>
            <Button onClick={() => navigate(`/sales/${sale.id}`)}>
              {messages.pos.viewInvoice}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {messages.pos.newSale}
            </Button>
          </>
        ) : null
      }
    >
      {sale ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
            <span className="text-sm text-text-muted">{messages.pos.invoiceNumber}</span>
            <span dir="ltr" className="numeric text-sm font-semibold text-text">
              {sale.invoice_number}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-muted">{messages.pos.finalTotal}</dt>
              <dd className="numeric text-lg font-semibold text-text">
                {formatMoneyValue(sale.total_amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-muted">{messages.pos.paymentMethod}</dt>
              <dd>{messages.sales.payment[sale.payment_method] ?? sale.payment_method}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-muted">{messages.sales.issuedAt}</dt>
              <dd className="numeric">{formatDateTime(sale.created_at)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-muted">{messages.sales.statusFilter}</dt>
              <dd>
                <Badge tone={sale.status === 'CANCELLED' ? 'danger' : 'success'}>
                  {messages.sales.status[sale.status] ?? sale.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Modal>
  )
}
