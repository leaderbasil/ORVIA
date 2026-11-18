import { fromCents, multiplyCents, sumCents, toCents } from './money'

const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/

/** Merge by product id and never exceed the stock shown by the server. */
export function addProductToCart(cart, product) {
  const existing = cart.find((item) => item.id === product.id)
  if (existing) {
    if (existing.quantity >= product.stock_quantity) return cart
    return cart.map((item) =>
      item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
    )
  }
  if (product.stock_quantity < 1) return cart
  return [...cart, { ...product, quantity: 1 }]
}

export function changeCartQuantity(cart, productId, requestedQuantity) {
  return cart.map((item) => {
    if (item.id !== productId) return item
    const parsed = Number.parseInt(requestedQuantity, 10)
    const safe = Number.isFinite(parsed) ? parsed : 1
    const quantity = Math.min(item.stock_quantity, Math.max(1, safe))
    return { ...item, quantity }
  })
}

export function removeCartItem(cart, productId) {
  return cart.filter((item) => item.id !== productId)
}

export function cartItemCount(cart) {
  return cart.reduce((total, item) => total + Number(item.quantity), 0)
}

export function cartSubtotalCents(cart) {
  return sumCents(
    cart.map((item) => multiplyCents(toCents(item.selling_price), item.quantity)),
  )
}

export function cartLineTotal(item) {
  return fromCents(multiplyCents(toCents(item.selling_price), item.quantity))
}

/** Parse the free-text discount field; an empty value means zero. */
export function parseDiscountInput(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '') return { valid: true, cents: 0 }
  if (!MONEY_INPUT_PATTERN.test(trimmed)) return { valid: false, cents: 0 }
  return { valid: true, cents: toCents(trimmed) }
}
