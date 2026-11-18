import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { messages } from '../../constants/messages.js'
import { TOKEN_STORAGE_KEY } from '../../services/api.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import Login from './Login.jsx'

vi.mock('../../services/auth.service', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('../../constants/demo.js', () => ({
  demoLoginEnabled: true,
  demoCredentials: { email: 'demo@example.com', password: 'demo-password' },
}))

import * as authService from '../../services/auth.service'

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows client-side validation messages for empty fields', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: messages.actions.login }))

    const errors = await screen.findAllByText(messages.validation.required)
    expect(errors).toHaveLength(2)
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('shows the Arabic message for invalid credentials', async () => {
    authService.login.mockRejectedValue({
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } },
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'admin@example.com')
    await user.type(screen.getByLabelText(/كلمة المرور/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: messages.actions.login }))

    expect(await screen.findByText(messages.errors.INVALID_CREDENTIALS)).toBeInTheDocument()
  })

  it('stores the session after a successful login', async () => {
    authService.login.mockResolvedValue({
      access_token: 'test-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: '5f0c4f7a-0000-0000-0000-000000000001',
        full_name: 'Store Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        is_active: true,
      },
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'admin@example.com')
    await user.type(screen.getByLabelText(/كلمة المرور/), 'admin-password')
    await user.click(screen.getByRole('button', { name: messages.actions.login }))

    await waitFor(() => {
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-token')
    })
    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'admin-password',
    })
  })

  it('logs in with the configured demo account', async () => {
    authService.login.mockResolvedValue({
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: '5f0c4f7a-0000-0000-0000-000000000002',
        full_name: 'Demo Admin',
        email: 'demo@example.com',
        role: 'ADMIN',
        is_active: true,
      },
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: messages.auth.demoLogin }))

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'demo@example.com',
        password: 'demo-password',
      })
    })
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('demo-token')
  })
})
