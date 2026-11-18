import axios from 'axios'

import { messages } from '../constants/messages'

export const TOKEN_STORAGE_KEY = 'pos.access_token'
export const USER_STORAGE_KEY = 'pos.current_user'
export const UNAUTHORIZED_EVENT = 'pos:unauthorized'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = Boolean(error.config?.url?.includes('/auth/login'))
    if (error.response?.status === 401 && !isLoginRequest) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      sessionStorage.removeItem(USER_STORAGE_KEY)
      // AuthContext listens for this and clears the user; ProtectedRoute then
      // redirects to /login.
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export function unwrap(response) {
  return response.data?.data
}

export function getApiErrorCode(error) {
  if (error?.response?.data?.code) return error.response.data.code
  if (error?.response) return 'INTERNAL_ERROR'
  return 'NETWORK_ERROR'
}

export function getApiErrorMessage(error) {
  return messages.errors[getApiErrorCode(error)] ?? messages.errors.UNKNOWN
}

export function getApiErrorMeta(error) {
  return error?.response?.data?.meta ?? null
}
