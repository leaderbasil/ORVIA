import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Spinner from '../components/common/Spinner.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return children ?? <Outlet />
}
