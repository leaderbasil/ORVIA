import { api, unwrap } from './api'
import { getStoredDemoProducts, saveDemoProducts } from './mockDemoData.js'

const DEMO_TOKEN = 'demo-mock-access-token-orvia'
const isDemoMode = () => sessionStorage.getItem('pos.access_token') === DEMO_TOKEN

export async function listProducts(params = {}) {
  if (isDemoMode()) {
    let products = getStoredDemoProducts()
    if (params.search) {
      const q = params.search.toLowerCase()
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
      )
    }
    if (params.category) {
      products = products.filter((p) => p.category === params.category)
    }
    return {
      items: products,
      total: products.length,
      page: params.page || 1,
      size: params.size || 20,
      pages: 1,
    }
  }

  const response = await api.get('/products', { params })
  return unwrap(response)
}

export async function searchProducts(query) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const q = query.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
    )
  }

  const response = await api.get('/products/search', { params: { q: query } })
  return unwrap(response)
}

export async function listLowStockProducts(params = {}) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const lowStock = products.filter((p) => p.stock_quantity <= p.minimum_stock)
    return {
      items: lowStock,
      total: lowStock.length,
      page: 1,
      size: 20,
      pages: 1,
    }
  }

  const response = await api.get('/products/low-stock', { params })
  return unwrap(response)
}

export async function getProduct(id) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const product = products.find((p) => p.id === id)
    if (!product) throw new Error('Product not found')
    return product
  }

  const response = await api.get(`/products/${id}`)
  return unwrap(response)
}

export async function createProduct(payload) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const newProduct = {
      id: `prod-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    }
    products.unshift(newProduct)
    saveDemoProducts(products)
    return newProduct
  }

  const response = await api.post('/products', payload)
  return unwrap(response)
}

export async function updateProduct(id, payload) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const index = products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Product not found')
    products[index] = { ...products[index], ...payload }
    saveDemoProducts(products)
    return products[index]
  }

  const response = await api.patch(`/products/${id}`, payload)
  return unwrap(response)
}

export async function disableProduct(id) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const index = products.findIndex((p) => p.id === id)
    if (index !== -1) {
      products[index].is_active = false
      saveDemoProducts(products)
    }
    return
  }

  await api.delete(`/products/${id}`)
}
