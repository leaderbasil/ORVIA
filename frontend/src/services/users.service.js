import { api, unwrap } from './api'

export async function listUsers(params = {}) {
  const response = await api.get('/users', { params })
  return unwrap(response)
}

export async function createUser(payload) {
  const response = await api.post('/users', payload)
  return unwrap(response)
}

export async function updateUser(id, payload) {
  const response = await api.patch(`/users/${id}`, payload)
  return unwrap(response)
}

export async function updateUserStatus(id, isActive) {
  const response = await api.patch(`/users/${id}/status`, { is_active: isActive })
  return unwrap(response)
}
