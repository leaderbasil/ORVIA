import { api, unwrap } from './api'
import { demoCredentials } from '../constants/demo.js'

const DEMO_TOKEN = 'demo-mock-access-token-orvia'

export async function login({ email, password }) {
  if (
    demoCredentials &&
    email.trim().toLowerCase() === demoCredentials.email.toLowerCase() &&
    password === demoCredentials.password
  ) {
    return {
      data: {
        access_token: DEMO_TOKEN,
        token_type: 'bearer',
        expires_in: 1800,
        user: {
          id: 'demo-admin-id',
          full_name: 'Demo Admin',
          email: demoCredentials.email,
          role: 'ADMIN',
          is_active: true,
        },
      },
      message: 'Logged in',
    }
  }

  const response = await api.post('/auth/login', { email, password })
  return unwrap(response)
}

export async function getMe() {
  const token = sessionStorage.getItem('pos.access_token')
  if (token === DEMO_TOKEN) {
    const demoEmail = demoCredentials?.email || 'admin@example.com'
    return {
      data: {
        id: 'demo-admin-id',
        full_name: 'Demo Admin',
        email: demoEmail,
        role: 'ADMIN',
        is_active: true,
      },
      message: 'OK',
    }
  }

  const response = await api.get('/auth/me')
  return unwrap(response)
}
