import { api, unwrap } from './api'
import { getStoredDemoSales, saveDemoSales, getStoredDemoProducts, saveDemoProducts } from './mockDemoData.js'

const DEMO_TOKEN = 'demo-mock-access-token-orvia'
const isDemoMode = () => sessionStorage.getItem('pos.access_token') === DEMO_TOKEN

export async function listSales(params = {}) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    return {
      items: sales,
      total: sales.length,
      page: params.page || 1,
      size: params.size || 20,
      pages: 1,
    }
  }

  const response = await api.get('/sales', { params })
  return unwrap(response)
}

export async function getSale(id) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    const sale = sales.find((s) => s.id === id)
    if (!sale) throw new Error('Sale not found')
    return sale
  }

  const response = await api.get(`/sales/${id}`)
  return unwrap(response)
}

export async function createSale(payload, idempotencyKey) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    const products = getStoredDemoProducts()

    // Calculate totals & update stock
    let subtotal = 0
    const items = payload.items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.product_id)
      const unitPrice = prod ? parseFloat(prod.selling_price) : 1.00
      const lineTotal = unitPrice * item.quantity
      subtotal += lineTotal

      // Deduct stock
      if (prod) {
        prod.stock_quantity = Math.max(0, prod.stock_quantity - item.quantity)
      }

      return {
        id: `item-${Date.now()}-${idx}`,
        product_name: prod ? prod.name : 'Product',
        quantity: item.quantity,
        unit_price: unitPrice.toFixed(2),
        line_total: lineTotal.toFixed(2),
      }
    })

    saveDemoProducts(products)

    const newSale = {
      id: `sale-${Date.now()}`,
      invoice_number: `INV-2026-${String(sales.length + 1).padStart(4, '0')}`,
      status: 'COMPLETED',
      subtotal: subtotal.toFixed(2),
      tax_total: '0.00',
      grand_total: subtotal.toFixed(2),
      amount_tendered: payload.amount_tendered || subtotal.toFixed(2),
      change_amount: (parseFloat(payload.amount_tendered || subtotal) - subtotal).toFixed(2),
      payment_method: payload.payment_method || 'CASH',
      created_at: new Date().toISOString(),
      seller: { full_name: 'Demo Admin', email: 'admin@example.com' },
      items,
    }

    sales.unshift(newSale)
    saveDemoSales(sales)
    return newSale
  }

  const response = await api.post('/sales', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return unwrap(response)
}

export async function cancelSale(id) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales()
    const sale = sales.find((s) => s.id === id)
    if (sale) {
      sale.status = 'CANCELLED'
      saveDemoSales(sales)
    }
    return sale
  }

  const response = await api.post(`/sales/${id}/cancel`)
  return unwrap(response)
}

export async function getSaleInvoice(id) {
  if (isDemoMode()) {
    return getSale(id)
  }

  const response = await api.get(`/sales/${id}/invoice`)
  return unwrap(response)
}
