import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReceiptText } from 'lucide-react'
import { toast } from 'sonner'

import Button from '../../components/common/Button.jsx'
import CartPanel from '../../components/pos/CartPanel.jsx'
import ProductSearchPanel from '../../components/pos/ProductSearchPanel.jsx'
import SaleSuccessDialog from '../../components/pos/SaleSuccessDialog.jsx'
import { messages } from '../../constants/messages.js'
import { useCreateSale } from '../../hooks/useSales.js'
import { getApiErrorMessage } from '../../services/api.js'
import {
  addProductToCart,
  cartSubtotalCents,
  changeCartQuantity,
  parseDiscountInput,
  removeCartItem,
} from '../../utils/cart.js'
import { createIdempotencyKey } from '../../utils/idempotency.js'
import { fromCents } from '../../utils/money.js'

export default function POS() {
  const navigate = useNavigate()
  const createSale = useCreateSale()
  const idempotencyKeyRef = useRef(createIdempotencyKey())

  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [serverError, setServerError] = useState('')
  const [successSale, setSuccessSale] = useState(null)

  const resetCheckoutKey = () => {
    // A new cart/filter/amount is a new checkout intent. Retrying an unchanged
    // cart keeps the same key so the server can replay safely.
    idempotencyKeyRef.current = createIdempotencyKey()
  }

  const subtotalCents = useMemo(() => cartSubtotalCents(cart), [cart])
  const discountState = useMemo(() => parseDiscountInput(discount), [discount])

  let discountError
  if (!discountState.valid) {
    discountError = messages.pos.discountInvalid
  } else if (discountState.cents > subtotalCents) {
    discountError = messages.pos.discountTooLarge
  }

  const effectiveDiscountCents = discountState.valid
    ? Math.min(discountState.cents, subtotalCents)
    : 0
  const totalCents = Math.max(0, subtotalCents - effectiveDiscountCents)

  const handleAdd = (product) => {
    setCart((current) => addProductToCart(current, product))
    resetCheckoutKey()
    setServerError('')
  }

  const handleQuantityChange = (productId, quantity) => {
    setCart((current) => changeCartQuantity(current, productId, quantity))
    resetCheckoutKey()
    setServerError('')
  }

  const handleRemove = (productId) => {
    setCart((current) => removeCartItem(current, productId))
    resetCheckoutKey()
    setServerError('')
  }

  const handleClear = () => {
    setCart([])
    setDiscount('')
    setPaymentMethod('CASH')
    resetCheckoutKey()
    setServerError('')
  }

  const handleDiscountChange = (value) => {
    setDiscount(value)
    resetCheckoutKey()
    setServerError('')
  }

  const handlePaymentChange = (method) => {
    setPaymentMethod(method)
    resetCheckoutKey()
    setServerError('')
  }

  const handleCheckout = async () => {
    if (cart.length === 0 || discountError || createSale.isPending) return

    setServerError('')
    const payload = {
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      payment_method: paymentMethod,
      discount_amount: fromCents(discountState.valid ? discountState.cents : 0),
    }

    try {
      const sale = await createSale.mutateAsync({
        payload,
        idempotencyKey: idempotencyKeyRef.current,
      })
      toast.success(messages.pos.saleCreated)
      setSuccessSale(sale)
      setCart([])
      setDiscount('')
      setPaymentMethod('CASH')
      idempotencyKeyRef.current = createIdempotencyKey()
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <ProductSearchPanel cart={cart} onAdd={handleAdd} />
        <CartPanel
          headerAction={
            <Button variant="secondary" size="sm" onClick={() => navigate('/sales')}>
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              {messages.nav.sales}
            </Button>
          }
          cart={cart}
          subtotalCents={subtotalCents}
          discount={discount}
          discountError={discountError}
          effectiveDiscountCents={effectiveDiscountCents}
          totalCents={totalCents}
          paymentMethod={paymentMethod}
          onPaymentChange={handlePaymentChange}
          onDiscountChange={handleDiscountChange}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
          onClear={handleClear}
          onCheckout={handleCheckout}
          isSubmitting={createSale.isPending}
          serverError={serverError}
        />
      </div>

      <SaleSuccessDialog sale={successSale} onClose={() => setSuccessSale(null)} />
    </div>
  )
}
