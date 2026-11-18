import { api, unwrap } from './api'

export async function listSales(params = {}) {
  const response = await api.get('/sales', { params })
  return unwrap(response)
}

export async function getSale(id) {
  const response = await api.get(`/sales/${id}`)
  return unwrap(response)
}

export async function createSale(payload, idempotencyKey) {
  const response = await api.post('/sales', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return unwrap(response)
}

export async function cancelSale(id) {
  const response = await api.post(`/sales/${id}/cancel`)
  return unwrap(response)
}

export async function getSaleInvoice(id) {
  const response = await api.get(`/sales/${id}/invoice`)
  return unwrap(response)
}
