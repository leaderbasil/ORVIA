import { describe, expect, it } from 'vitest'

import {
  addProductToCart,
  cartSubtotalCents,
  changeCartQuantity,
  parseDiscountInput,
  removeCartItem,
} from './cart'
import { createIdempotencyKey } from './idempotency'

const milk = {
  id: 'product-1',
  name: 'Milk',
  sku: 'MILK-1L',
  selling_price: '3.50',
  stock_quantity: 3,
  minimum_stock: 1,
}

const bread = {
  id: 'product-2',
  name: 'Bread',
  sku: 'BREAD-1',
  selling_price: '1.25',
  stock_quantity: 10,
  minimum_stock: 2,
}

describe('POS cart helpers', () => {
  it('merges duplicate products and never exceeds stock', () => {
    let cart = addProductToCart([], milk)
    cart = addProductToCart(cart, milk)
    expect(cart).toHaveLength(1)
    expect(cart[0].quantity).toBe(2)

    cart = addProductToCart(cart, milk)
    cart = addProductToCart(cart, milk)
    expect(cart[0].quantity).toBe(3)
  })

  it('does not add an out-of-stock product', () => {
    const cart = addProductToCart([], { ...milk, stock_quantity: 0 })
    expect(cart).toEqual([])
  })

  it('clamps manual quantities between one and available stock', () => {
    const cart = addProductToCart([], milk)
    expect(changeCartQuantity(cart, milk.id, 0)[0].quantity).toBe(1)
    expect(changeCartQuantity(cart, milk.id, 99)[0].quantity).toBe(3)
    expect(changeCartQuantity(cart, milk.id, 2)[0].quantity).toBe(2)
  })

  it('removes a line and totals integer cents', () => {
    let cart = addProductToCart([], milk)
    cart = addProductToCart(cart, milk)
    cart = addProductToCart(cart, bread)

    expect(cartSubtotalCents(cart)).toBe(825)

    const withoutMilk = removeCartItem(cart, milk.id)
    expect(withoutMilk).toHaveLength(1)
    expect(cartSubtotalCents(withoutMilk)).toBe(125)
  })

  it('validates the discount input without floats', () => {
    expect(parseDiscountInput('')).toEqual({ valid: true, cents: 0 })
    expect(parseDiscountInput('1.5')).toEqual({ valid: true, cents: 150 })
    expect(parseDiscountInput('1.234')).toEqual({ valid: false, cents: 0 })
    expect(parseDiscountInput('-1.00')).toEqual({ valid: false, cents: 0 })
    expect(parseDiscountInput('abc')).toEqual({ valid: false, cents: 0 })
  })

  it('creates idempotency keys in the server-accepted length range', () => {
    const first = createIdempotencyKey()
    const second = createIdempotencyKey()

    expect(first.length).toBeGreaterThanOrEqual(8)
    expect(first.length).toBeLessThanOrEqual(100)
    expect(first).not.toBe(second)
  })
})
