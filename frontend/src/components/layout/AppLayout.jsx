import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const role = user?.role ?? 'CASHIER'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          role={role}
          onLogout={handleLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
