import { api, unwrap } from './api'
import { getStoredDemoSales, getStoredDemoProducts } from './mockDemoData.js'

const DEMO_TOKEN = 'demo-mock-access-token-orvia'
const isDemoMode = () => sessionStorage.getItem('pos.access_token') === DEMO_TOKEN

export async function getDashboard() {
  if (isDemoMode()) {
    const sales = getStoredDemoSales().filter(s => s.status === 'COMPLETED')
    const products = getStoredDemoProducts()
    const totalRevenue = sales.reduce((acc, s) => acc + parseFloat(s.grand_total || 0), 0)
    const lowStockCount = products.filter(p => p.stock_quantity <= p.minimum_stock).length

    // Generate 30 daily series points
    const series = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      return {
        date: d.toISOString().split('T')[0],
        sales_count: i === 29 ? sales.length : (i % 3 === 0 ? 2 : 0),
        revenue: i === 29 ? totalRevenue : (i % 3 === 0 ? 19.50 : 0),
      }
    })

    return {
      summary: {
        total_revenue: totalRevenue.toFixed(2),
        total_sales_count: sales.length,
        low_stock_count: lowStockCount,
        active_products_count: products.filter(p => p.is_active).length,
      },
      daily_series: series,
    }
  }

  const response = await api.get('/reports/dashboard')
  return unwrap(response)
}

export async function getSalesReport(params = {}) {
  if (isDemoMode()) {
    const sales = getStoredDemoSales().filter(s => s.status === 'COMPLETED')
    const totalRevenue = sales.reduce((acc, s) => acc + parseFloat(s.grand_total || 0), 0)
    return {
      total_sales: sales.length,
      total_revenue: totalRevenue.toFixed(2),
      items: sales,
    }
  }

  const response = await api.get('/reports/sales', { params })
  return unwrap(response)
}

export async function getTopProducts(params = {}) {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    return products.slice(0, 5).map(p => ({
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      total_quantity_sold: Math.floor(Math.random() * 20) + 5,
      total_revenue: (parseFloat(p.selling_price) * 10).toFixed(2),
    }))
  }

  const response = await api.get('/reports/top-products', { params })
  return unwrap(response)
}

export async function getInventoryReport() {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const totalValue = products.reduce((acc, p) => acc + (p.stock_quantity * parseFloat(p.cost_price || 0)), 0)
    return {
      total_items_count: products.length,
      total_stock_units: products.reduce((acc, p) => acc + p.stock_quantity, 0),
      total_inventory_cost_value: totalValue.toFixed(2),
      items: products,
    }
  }

  const response = await api.get('/reports/inventory')
  return unwrap(response)
}
