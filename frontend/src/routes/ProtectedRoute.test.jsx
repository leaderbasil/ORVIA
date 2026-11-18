import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '../context/AuthContext.jsx'
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/api.js'
import ProtectedRoute from './ProtectedRoute.jsx'

vi.mock('../services/auth.service', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}))

import * as authService from '../services/auth.service'

const ADMIN = {
  id: 'admin-id',
  full_name: 'Store Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  is_active: true,
}

const CASHIER = {
  id: 'cashier-id',
  full_name: 'Front Cashier',
  email: 'cashier@example.com',
  role: 'CASHIER',
  is_active: true,
}

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/forbidden" element={<p>forbidden page</p>} />
          <Route
            path="/products"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <p>products page</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects anonymous visitors to the login page', async () => {
    renderProtectedRoute()

    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('renders the route for an allowed role after restoring the session', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'admin-token')
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(ADMIN))
    authService.getMe.mockResolvedValue(ADMIN)

    renderProtectedRoute()

    expect(await screen.findByText('products page')).toBeInTheDocument()
    expect(authService.getMe).toHaveBeenCalled()
  })

  it('redirects a cashier away from an admin-only route', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'cashier-token')
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(CASHIER))
    authService.getMe.mockResolvedValue(CASHIER)

    renderProtectedRoute()

    expect(await screen.findByText('forbidden page')).toBeInTheDocument()
  })

  it('clears the session when the stored token is rejected', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'expired-token')
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(ADMIN))
    authService.getMe.mockRejectedValue({
      response: { status: 401, data: { code: 'TOKEN_INVALID' } },
    })

    renderProtectedRoute()

    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
