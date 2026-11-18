import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import AppLayout from '../components/layout/AppLayout.jsx'
import Spinner from '../components/common/Spinner.jsx'
import Login from '../pages/auth/Login.jsx'
import Forbidden from '../pages/Forbidden.jsx'
import NotFound from '../pages/NotFound.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const Dashboard = lazy(() => import('../pages/dashboard/Dashboard.jsx'))
const Inventory = lazy(() => import('../pages/inventory/Inventory.jsx'))
const POS = lazy(() => import('../pages/pos/POS.jsx'))
const CreateProduct = lazy(() => import('../pages/products/CreateProduct.jsx'))
const EditProduct = lazy(() => import('../pages/products/EditProduct.jsx'))
const Products = lazy(() => import('../pages/products/Products.jsx'))
const Reports = lazy(() => import('../pages/reports/Reports.jsx'))
const SaleDetails = lazy(() => import('../pages/sales/SaleDetails.jsx'))
const SalesHistory = lazy(() => import('../pages/sales/SalesHistory.jsx'))
const Users = lazy(() => import('../pages/users/Users.jsx'))

function LazyPage({ children }) {
  return <Suspense fallback={<Spinner className="py-16" />}>{children}</Suspense>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <Dashboard />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="pos"
            element={
              <LazyPage>
                <POS />
              </LazyPage>
            }
          />
          <Route
            path="products"
            element={
              <LazyPage>
                <Products />
              </LazyPage>
            }
          />
          <Route
            path="products/new"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <CreateProduct />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="products/:id/edit"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <EditProduct />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="sales"
            element={
              <LazyPage>
                <SalesHistory />
              </LazyPage>
            }
          />
          <Route
            path="sales/:id"
            element={
              <LazyPage>
                <SaleDetails />
              </LazyPage>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <Reports />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <Inventory />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LazyPage>
                  <Users />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route path="forbidden" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
