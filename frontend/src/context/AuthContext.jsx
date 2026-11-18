import { useCallback, useEffect, useMemo, useState } from 'react'

import * as authService from '../services/auth.service'
import {
  TOKEN_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
  USER_STORAGE_KEY,
} from '../services/api'
import { AuthContext } from './auth-context.js'

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [isInitializing, setIsInitializing] = useState(
    () => Boolean(sessionStorage.getItem(TOKEN_STORAGE_KEY)),
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    sessionStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
    setIsInitializing(false)
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    sessionStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
    setIsInitializing(false)
    return data.user
  }, [])

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.getMe()
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser))
    setUser(currentUser)
    return currentUser
  }, [])

  useEffect(() => {
    let cancelled = false
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)

    if (!storedToken) {
      setIsInitializing(false)
      return undefined
    }

    async function refreshCurrentUser() {
      try {
        const currentUser = await authService.getMe()
        if (cancelled) return
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser))
        setUser(currentUser)
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    refreshCurrentUser()
    return () => {
      cancelled = true
    }
  }, [logout])

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [logout])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isInitializing, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
