import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Input from '../../components/common/Input.jsx'
import { messages } from '../../constants/messages.js'
import { cartItemCount, cartLineTotal } from '../../utils/cart.js'
import { cn } from '../../utils/cn.js'
import { formatMoneyValue } from '../../utils/currency.js'
import { fromCents } from '../../utils/money.js'

const PAYMENT_METHODS = ['CASH', 'CARD']

function QuantityControl({ item, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border bg-surface">
        <button
          type="button"
          onClick={() => onChange(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
          aria-label={messages.pos.decrease}
          title={messages.pos.decrease}
          className="flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          type="number"
          min="1"
          max={item.stock_quantity}
          step="1"
          value={item.quantity}
          onChange={(event) => {
            if (event.target.value === '') return
            onChange(item.id, event.target.value)
          }}
          aria-label={`${messages.pos.quantity}: ${item.name}`}
          className="numeric h-8 w-11 border-x border-border bg-surface text-center text-sm text-text focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.stock_quantity}
          aria-label={messages.pos.increase}
          title={messages.pos.increase}
          className="flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`${messages.pos.remove}: ${item.name}`}
        title={messages.pos.remove}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger-soft hover:text-danger-strong"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export default function CartPanel({
  headerAction,
  cart,
  subtotalCents,
  discount,
  discountError,
  effectiveDiscountCents,
  totalCents,
  paymentMethod,
  onPaymentChange,
  onDiscountChange,
  onQuantityChange,
  onRemove,
  onClear,
  onCheckout,
  isSubmitting,
  serverError,
}) {
  const count = cartItemCount(cart)
  const canCheckout = cart.length > 0 && !discountError && !isSubmitting

  return (
    <Card className="flex flex-col overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-12rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary-strong">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text">{messages.pos.cartTitle}</h2>
            <p className="text-xs text-text-muted">
              <span className="numeric">{count}</span> {messages.pos.itemCount}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {cart.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClear} disabled={isSubmitting}>
              {messages.pos.clearCart}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={messages.pos.emptyTitle}
            description={messages.pos.emptyDescription}
          />
        ) : (
          <ul className="divide-y divide-border">
            {cart.map((item) => (
              <li key={item.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{item.name}</p>
                    <p className="numeric text-xs text-text-muted">
                      {item.sku} · {formatMoneyValue(item.selling_price)}
                    </p>
                  </div>
                  <span className="numeric shrink-0 text-sm font-semibold text-text">
                    {formatMoneyValue(cartLineTotal(item))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <QuantityControl
                    item={item}
                    onChange={onQuantityChange}
                    onRemove={onRemove}
                  />
                  <span className="text-xs text-text-muted">
                    {messages.pos.available}{' '}
                    <span className="numeric">{item.stock_quantity}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border p-4">
        {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

        <div
          role="radiogroup"
          aria-label={messages.pos.paymentMethod}
          className="grid grid-cols-2 gap-2"
        >
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method
            return (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onPaymentChange(method)}
                disabled={isSubmitting}
                className={cn(
                  'h-9 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  selected
                    ? 'border-primary-strong bg-primary-soft text-primary-strong'
                    : 'border-border bg-surface text-text-muted hover:bg-background hover:text-text',
                )}
              >
                {messages.pos.payment[method]}
              </button>
            )
          })}
        </div>

        <Input
          label={messages.pos.discount}
          inputMode="decimal"
          dir="ltr"
          className="numeric text-start"
          placeholder={messages.pos.discountPlaceholder}
          value={discount}
          onChange={(event) => onDiscountChange(event.target.value)}
          error={discountError}
          hint={discountError ? undefined : messages.pos.discountHint}
          disabled={isSubmitting}
        />

        <dl className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="text-text-muted">{messages.pos.subtotal}</dt>
            <dd className="numeric font-medium text-text">
              {formatMoneyValue(fromCents(subtotalCents))}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-text-muted">{messages.pos.discount}</dt>
            <dd className="numeric text-text-muted">
              −{formatMoneyValue(fromCents(effectiveDiscountCents))}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-text-muted">{messages.pos.taxHint}</p>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="font-semibold text-text">{messages.pos.estimatedTotal}</span>
          <span className="numeric text-lg font-semibold text-text">
            {formatMoneyValue(fromCents(totalCents))}
          </span>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={onCheckout}
          loading={isSubmitting}
          disabled={!canCheckout}
        >
          {isSubmitting ? messages.pos.checkoutPending : messages.pos.checkout}
        </Button>
      </div>
    </Card>
  )
}
