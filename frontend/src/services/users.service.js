import { api, unwrap } from './api'
import {
  demoError,
  isDemoMode,
  paginateDemoItems,
  parseDemoBoolean,
} from './demoMode.js'
import {
  DEMO_ADMIN_ID,
  getStoredDemoUsers,
  saveDemoUsers,
} from './mockDemoData.js'

function normalizeRole(role) {
  if (role !== 'ADMIN' && role !== 'CASHIER') {
    throw demoError('VALIDATION_ERROR', 422)
  }
  return role
}

function activeAdminCount(users) {
  return users.filter((user) => user.role === 'ADMIN' && user.is_active).length
}

function findUserOrThrow(users, id) {
  const index = users.findIndex((user) => user.id === id)
  if (index === -1) throw demoError('USER_NOT_FOUND', 404)
  return { index, user: users[index] }
}

function normalizeFullName(value) {
  const fullName = String(value ?? '').trim()
  if (!fullName) throw demoError('VALIDATION_ERROR', 422)
  return fullName
}

export async function listUsers(params = {}) {
  if (isDemoMode()) {
    let users = getStoredDemoUsers()
    const search = String(params.search ?? '').trim().toLowerCase()

    if (search) {
      users = users.filter(
        (user) =>
          user.full_name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search),
      )
    }
    if (params.role) {
      users = users.filter((user) => user.role === params.role)
    }

    const isActive = parseDemoBoolean(params.is_active)
    if (isActive !== null) {
      users = users.filter(
        (user) => Boolean(user.is_active) === isActive,
      )
    }

    users.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        a.id.localeCompare(b.id),
    )

    return paginateDemoItems(users, params)
  }

  const response = await api.get('/users', { params })
  return unwrap(response)
}

export async function createUser(payload = {}) {
  if (isDemoMode()) {
    const users = getStoredDemoUsers()
    const fullName = normalizeFullName(payload.full_name)
    const email = String(payload.email ?? '').trim().toLowerCase()
    if (!email) throw demoError('VALIDATION_ERROR', 422)

    if (users.some((user) => user.email.toLowerCase() === email)) {
      throw demoError('DUPLICATE_EMAIL', 409)
    }

    const role = normalizeRole(payload.role)
    const now = new Date().toISOString()
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      full_name: fullName,
      email,
      role,
      is_active: true,
      created_at: now,
      updated_at: now,
    }

    users.unshift(user)
    saveDemoUsers(users)
    return user
  }

  const response = await api.post('/users', payload)
  return unwrap(response)
}

export async function updateUser(id, payload = {}) {
  if (isDemoMode()) {
    const users = getStoredDemoUsers()
    const { index, user } = findUserOrThrow(users, id)

    if (payload.full_name !== undefined) {
      user.full_name = normalizeFullName(payload.full_name)
    }

    if (payload.role !== undefined) {
      const nextRole = normalizeRole(payload.role)
      if (nextRole !== user.role) {
        if (user.id === DEMO_ADMIN_ID) {
          throw demoError('CANNOT_MODIFY_SELF', 409)
        }
        if (
          user.role === 'ADMIN' &&
          user.is_active &&
          activeAdminCount(users) <= 1
        ) {
          throw demoError('LAST_ADMIN', 409)
        }
        user.role = nextRole
      }
    }

    user.updated_at = new Date().toISOString()
    users[index] = user
    saveDemoUsers(users)
    return user
  }

  const response = await api.patch(`/users/${id}`, payload)
  return unwrap(response)
}

export async function updateUserStatus(id, isActive) {
  if (isDemoMode()) {
    const users = getStoredDemoUsers()
    const { index, user } = findUserOrThrow(users, id)
    const active = Boolean(isActive)

    if (user.id === DEMO_ADMIN_ID && !active) {
      throw demoError('CANNOT_MODIFY_SELF', 409)
    }
    if (
      !active &&
      user.role === 'ADMIN' &&
      user.is_active &&
      activeAdminCount(users) <= 1
    ) {
      throw demoError('LAST_ADMIN', 409)
    }

    user.is_active = active
    user.updated_at = new Date().toISOString()
    users[index] = user
    saveDemoUsers(users)
    return user
  }

  const response = await api.patch(`/users/${id}/status`, {
    is_active: isActive,
  })
  return unwrap(response)
}
