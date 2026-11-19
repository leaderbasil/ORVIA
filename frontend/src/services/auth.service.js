import { demoCredentials } from '../constants/demo.js'
import { TOKEN_STORAGE_KEY, api, unwrap } from './api'
import { DEMO_TOKEN } from './demoMode.js'
import { ensureDemoAdmin, getDemoAdminUser } from './mockDemoData.js'

export async function login({ email, password }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (
    demoCredentials &&
    normalizedEmail === demoCredentials.email.trim().toLowerCase() &&
    password === demoCredentials.password
  ) {
    const user = ensureDemoAdmin({ email: demoCredentials.email })
    return {
      access_token: DEMO_TOKEN,
      token_type: 'bearer',
      expires_in: 1800,
      user,
    }
  }

  const response = await api.post('/auth/login', { email, password })
  return unwrap(response)
}

export async function getMe() {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  if (token === DEMO_TOKEN) {
    return getDemoAdminUser()
  }

  const response = await api.get('/auth/me')
  return unwrap(response)
}
