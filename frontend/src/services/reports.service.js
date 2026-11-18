import { api, unwrap } from './api'

export async function getDashboard() {
  const response = await api.get('/reports/dashboard')
  return unwrap(response)
}

export async function getSalesReport(params = {}) {
  const response = await api.get('/reports/sales', { params })
  return unwrap(response)
}

export async function getTopProducts(params = {}) {
  const response = await api.get('/reports/top-products', { params })
  return unwrap(response)
}

export async function getInventoryReport() {
  const response = await api.get('/reports/inventory')
  return unwrap(response)
}
