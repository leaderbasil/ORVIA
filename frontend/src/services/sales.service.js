import { APP_NAME } from '../constants/messages.js'
import { CURRENCY_CODE } from '../utils/currency.js'
import { fromCents, toCents } from '../utils/money.js'
import { api, unwrap } from './api'
import { demoError, isDemoMode, localDateKey, paginateDemoItems } from './demoMode.js'
import {
  getDemoAdminUser,
  getStoredDemoProducts,
  getStoredDemoSales,
  saveDemoProducts,
  saveDemoSales,
} from './mockDemoData.js'

function demoCashier() {
  const admin = getDemoAdminUser()
  return { id: admin.id, full_name: admin.full_name }
}

function saleInRange(sale, from, to) {
  if (!from && !to) return true
  const key = localDateKey(sale.created_at)
  if (from && key < from) return false
  if (to && key > to) return false
  return true
}

function toSaleSummary(sale) {
  const { items, ...summary } = sale
  return {
    ...summary,
    cashier: sale.cashier ?? demoCashier(),
    item_count: Array.isArray(items) ? items.length : (sale.item_count ?? 0),
  }
}

function toSaleDetail(sale) {
  const items = Array.isArray(sale.items) ? sale.items : []
  return {
    ...sale,
    cashier: sale.cashier ?? demoCashier(),
    item_count: items.length,
  }
}

function nextInvoiceNumber(sales) {
  const year = new Date().getFullYear()
  let maxSequence = 0

  for (const sale of sales) {
    const match = /^INV-\d{4}-(\d+)$/.exec(sale.invoice_number ?? '')
    if (match) {
      maxSequence = Math.max(maxSequence, Number(match[1]))
    }
  }

  return `INV-${year}-${String(maxSequence + 1).padStart(6, '0')}`
}

function parseDiscountCents(value) {
  try {
    return toCents(value ?? '0.00')
  } catch {
    throw demoError('INVALID_DISCOUNT')
  }
}

function withoutUnitCost(item) {
  const copy = { ...item }
  delete copy.unit_cost
  return copy
}

export async function listSales(params = {}) {
  if (isDemoMode()) {
    let sales = getStoredDemoSales()

    if (params.status) {
      sales = sales.filter((sale) => sale.status === params.status)
    }
    if (params.payment_method) {
      sales = sales.filter(
        (sale) => sale.payment_method === params.payment_method,
      )
    }
    if (params.invoice_number) {
      const invoice = String(params.invoice_number).trim().toLowerCase()
      sales = sales.filter((sale) =>
        String(sale.invoice_number ?? '').toLowerCase().includes(invoice),
      )
    }

    sales = sales
      .filter((sale) => saleInRange(sale, params.from, params.to))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
          b.id.localeCompare(a.id),
      )

    const page = paginateDemoItems(sales, params)
    return { ...page, items: page.items.map(toSaleSummary) }
  }

  const response = await api.get('/sales', { params })
  return unwrap(response)
}

export async function getSale(id) {
  if (isDemoMode()) {
    const sale = getStoredDemoSales().find((item) => item.id === id)
    if (!sale) throw demoError('SALE_NOT_FOUND', 404)
    return toSaleDetail(sale)
  }

  const response = await api.get(`/sales/${id}`)
  return unwrap(response)
}

export async function createSale(payload = {}, idempotencyKey) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    const key =
      typeof idempotencyKey === 'string' ? idempotencyKey.trim() : ''

    if (key) {
      const existing = sales.find((sale) => sale.idempotency_key === key)
      if (existing) return toSaleDetail(existing)
    }

    const requestItems = Array.isArray(payload.items) ? payload.items : []
    if (requestItems.length === 0) {
      throw demoError('EMPTY_CART', 422)
    }

    const quantities = new Map()
    for (const item of requestItems) {
      const productId = item?.product_id
      const quantity = Number(item?.quantity)
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw demoError('VALIDATION_ERROR', 422)
      }
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
    }

    const products = getStoredDemoProducts()
    const lineData = []
    let subtotalCents = 0

    // Validate the full cart before mutating any stock.
    for (const [productId, quantity] of quantities) {
      const product = products.find((item) => item.id === productId)
      if (!product) throw demoError('PRODUCT_NOT_FOUND', 404)
      if (!product.is_active) throw demoError('PRODUCT_INACTIVE', 409)
      if (Number(product.stock_quantity) < quantity) {
        throw demoError('INSUFFICIENT_STOCK', 409)
      }

      const unitPriceCents = toCents(product.selling_price)
      const lineTotalCents = unitPriceCents * quantity
      subtotalCents += lineTotalCents
      lineData.push({ product, quantity, unitPriceCents, lineTotalCents })
    }

    const discountCents = parseDiscountCents(payload.discount_amount)
    if (discountCents < 0 || discountCents > subtotalCents) {
      throw demoError('INVALID_DISCOUNT')
    }

    const taxCents = 0
    const totalCents = subtotalCents - discountCents + taxCents
    const stamp = Date.now()
    const createdAt = new Date().toISOString()

    const items = lineData.map((line, index) => {
      const { product, quantity, unitPriceCents, lineTotalCents } = line
      product.stock_quantity = Number(product.stock_quantity) - quantity
      product.updated_at = createdAt

      return {
        id: `demo-item-${stamp}-${index + 1}`,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity,
        unit_price: fromCents(unitPriceCents),
        unit_cost: fromCents(toCents(product.cost_price)),
        line_total: fromCents(lineTotalCents),
      }
    })

    saveDemoProducts(products)

    const sale = {
      id: `sale-${stamp}`,
      invoice_number: nextInvoiceNumber(sales),
      status: 'COMPLETED',
      cashier: demoCashier(),
      subtotal: fromCents(subtotalCents),
      discount_amount: fromCents(discountCents),
      tax_amount: fromCents(taxCents),
      total_amount: fromCents(totalCents),
      payment_method: payload.payment_method === 'CARD' ? 'CARD' : 'CASH',
      created_at: createdAt,
      item_count: items.length,
      items,
      idempotency_key: key || undefined,
    }

    sales.unshift(sale)
    saveDemoSales(sales)
    return toSaleDetail(sale)
  }

  const response = await api.post('/sales', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return unwrap(response)
}

export async function cancelSale(id) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    const sale = sales.find((item) => item.id === id)
    if (!sale) throw demoError('SALE_NOT_FOUND', 404)
    if (sale.status === 'CANCELLED') {
      throw demoError('SALE_ALREADY_CANCELLED', 409)
    }

    const products = getStoredDemoProducts()
    const updatedAt = new Date().toISOString()

    for (const item of sale.items ?? []) {
      const product = products.find((entry) => entry.id === item.product_id)
      if (!product) continue
      product.stock_quantity =
        Number(product.stock_quantity) + Number(item.quantity)
      product.updated_at = updatedAt
    }

    sale.status = 'CANCELLED'
    saveDemoProducts(products)
    saveDemoSales(sales)
    return toSaleDetail(sale)
  }

  const response = await api.post(`/sales/${id}/cancel`)
  return unwrap(response)
}

export async function getSaleInvoice(id) {
  if (isDemoMode()) {
    const sale = await getSale(id)
    return {
      ...sale,
      items: (sale.items ?? []).map(withoutUnitCost),
      store_name: APP_NAME,
      currency: CURRENCY_CODE,
    }
  }

  const response = await api.get(`/sales/${id}/invoice`)
  return unwrap(response)
}
