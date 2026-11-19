import { api, unwrap } from './api'
import {
  demoError,
  isDemoMode,
  paginateDemoItems,
  parseDemoBoolean,
} from './demoMode.js'
import { getStoredDemoProducts, saveDemoProducts } from './mockDemoData.js'

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text || null
}

function normalizeMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return '0.00'
  return amount.toFixed(2)
}

function normalizeProductPayload(payload) {
  return {
    ...payload,
    name: String(payload.name ?? '').trim(),
    sku: String(payload.sku ?? '').trim(),
    barcode: normalizeOptionalText(payload.barcode),
    category: normalizeOptionalText(payload.category),
    unit: String(payload.unit ?? 'piece').trim() || 'piece',
    cost_price: normalizeMoney(payload.cost_price),
    selling_price: normalizeMoney(payload.selling_price),
    stock_quantity: Math.max(0, Math.trunc(Number(payload.stock_quantity) || 0)),
    minimum_stock: Math.max(0, Math.trunc(Number(payload.minimum_stock) || 0)),
    is_active: payload.is_active ?? true,
  }
}

function assertValidProduct(product) {
  if (!product.name || !product.sku) {
    throw demoError('VALIDATION_ERROR', 422)
  }
}

function assertUniqueProduct(products, { sku, barcode, excludeId = null }) {
  if (sku && products.some((p) => p.id !== excludeId && p.sku === sku)) {
    throw demoError('DUPLICATE_SKU', 409)
  }
  if (
    barcode &&
    products.some((p) => p.id !== excludeId && p.barcode === barcode)
  ) {
    throw demoError('DUPLICATE_BARCODE', 409)
  }
}

function matchesSearch(product, term) {
  return (
    product.name.toLowerCase().includes(term) ||
    product.sku.toLowerCase().includes(term) ||
    (product.barcode ?? '').toLowerCase().includes(term)
  )
}

function sortProducts(products, sort) {
  const direction = sort?.startsWith('-') ? -1 : 1
  const key = sort?.replace(/^-/, '') || 'name'

  const compare = (a, b) => {
    if (key === 'selling_price') {
      return (Number(a.selling_price) - Number(b.selling_price)) * direction
    }
    if (key === 'stock_quantity') {
      return (Number(a.stock_quantity) - Number(b.stock_quantity)) * direction
    }
    if (key === 'created_at') {
      return (
        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) *
        direction
      )
    }
    return a.name.localeCompare(b.name, 'ar') * direction
  }

  return [...products].sort(
    (a, b) => compare(a, b) || a.id.localeCompare(b.id),
  )
}

export async function listProducts(params = {}) {
  if (isDemoMode()) {
    let products = getStoredDemoProducts()
    const search = String(params.search ?? '').trim().toLowerCase()

    if (search) {
      products = products.filter((product) => matchesSearch(product, search))
    }

    const category = String(params.category ?? '').trim().toLowerCase()
    if (category) {
      products = products.filter(
        (product) => String(product.category ?? '').toLowerCase() === category,
      )
    }

    const isActive = parseDemoBoolean(params.is_active)
    if (isActive !== null) {
      products = products.filter(
        (product) => Boolean(product.is_active) === isActive,
      )
    }

    return paginateDemoItems(sortProducts(products, params.sort), params)
  }

  const response = await api.get('/products', { params })
  return unwrap(response)
}

export async function searchProducts(query) {
  if (isDemoMode()) {
    const term = String(query ?? '').trim()
    if (!term) return []

    const lowered = term.toLowerCase()
    const products = getStoredDemoProducts().filter(
      (product) => product.is_active && matchesSearch(product, lowered),
    )

    return products
      .sort((a, b) => {
        const aExact = a.sku === term || a.barcode === term
        const bExact = b.sku === term || b.barcode === term
        if (aExact !== bExact) return aExact ? -1 : 1
        return a.name.localeCompare(b.name, 'ar')
      })
      .slice(0, 20)
  }

  const response = await api.get('/products/search', { params: { q: query } })
  return unwrap(response)
}

export async function listLowStockProducts(params = {}) {
  if (isDemoMode()) {
    let products = getStoredDemoProducts().filter(
      (product) =>
        product.is_active &&
        Number(product.stock_quantity) <= Number(product.minimum_stock),
    )

    const search = String(params.search ?? '').trim().toLowerCase()
    if (search) {
      products = products.filter((product) => matchesSearch(product, search))
    }

    products.sort(
      (a, b) =>
        Number(a.stock_quantity) -
          Number(a.minimum_stock) -
          (Number(b.stock_quantity) - Number(b.minimum_stock)) ||
        a.name.localeCompare(b.name, 'ar') ||
        a.id.localeCompare(b.id),
    )

    return paginateDemoItems(products, params)
  }

  const response = await api.get('/products/low-stock', { params })
  return unwrap(response)
}

export async function getProduct(id) {
  if (isDemoMode()) {
    const product = getStoredDemoProducts().find((item) => item.id === id)
    if (!product) throw demoError('PRODUCT_NOT_FOUND', 404)
    return product
  }

  const response = await api.get(`/products/${id}`)
  return unwrap(response)
}

export async function createProduct(payload) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const data = normalizeProductPayload(payload)
    assertValidProduct(data)
    assertUniqueProduct(products, data)

    const now = new Date().toISOString()
    const product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      created_at: now,
      updated_at: now,
    }
    products.unshift(product)
    saveDemoProducts(products)
    return product
  }

  const response = await api.post('/products', payload)
  return unwrap(response)
}

export async function updateProduct(id, payload) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const index = products.findIndex((product) => product.id === id)
    if (index === -1) throw demoError('PRODUCT_NOT_FOUND', 404)

    const data = normalizeProductPayload({ ...products[index], ...payload })
    assertValidProduct(data)
    assertUniqueProduct(products, {
      sku: data.sku,
      barcode: data.barcode,
      excludeId: id,
    })

    products[index] = {
      ...products[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    saveDemoProducts(products)
    return products[index]
  }

  const response = await api.patch(`/products/${id}`, payload)
  return unwrap(response)
}

export async function disableProduct(id) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const index = products.findIndex((product) => product.id === id)
    if (index === -1) throw demoError('PRODUCT_NOT_FOUND', 404)

    products[index] = {
      ...products[index],
      is_active: false,
      updated_at: new Date().toISOString(),
    }
    saveDemoProducts(products)
    return
  }

  await api.delete(`/products/${id}`)
}
