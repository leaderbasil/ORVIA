import { fromCents, toCents } from '../utils/money.js'
import { api, unwrap } from './api'
import {
  enumerateDateKeys,
  enumerateMonthKeys,
  isDemoMode,
  localDateKey,
  resolveDemoRange,
} from './demoMode.js'
import { getStoredDemoProducts, getStoredDemoSales } from './mockDemoData.js'

const DEFAULT_REPORT_DAYS = 30
const LOW_STOCK_ITEM_LIMIT = 50

function safeCents(value) {
  try {
    return toCents(value)
  } catch {
    return 0
  }
}

function completedSalesInRange(sales, from, to) {
  return sales.filter((sale) => {
    if (sale.status !== 'COMPLETED') return false
    const key = localDateKey(sale.created_at)
    return key >= from && key <= to
  })
}

function summarizeSales(sales) {
  const salesTotalCents = sales.reduce(
    (total, sale) => total + safeCents(sale.total_amount),
    0,
  )
  const discountCents = sales.reduce(
    (total, sale) => total + safeCents(sale.discount_amount),
    0,
  )
  const invoiceCount = sales.length

  return {
    sales_total: fromCents(salesTotalCents),
    invoice_count: invoiceCount,
    average_invoice: fromCents(
      invoiceCount ? Math.round(salesTotalCents / invoiceCount) : 0,
    ),
    total_discount: fromCents(discountCents),
  }
}

function grossProfit(sales) {
  let profitCents = 0
  for (const sale of sales) {
    for (const item of sale.items ?? []) {
      profitCents +=
        (safeCents(item.unit_price) - safeCents(item.unit_cost)) *
        Number(item.quantity ?? 0)
    }
  }
  return fromCents(profitCents)
}

function topProducts(sales, limit) {
  const grouped = new Map()

  for (const sale of sales) {
    for (const item of sale.items ?? []) {
      const key = item.product_id || item.sku || item.product_name
      const entry = grouped.get(key) ?? {
        product_id: item.product_id ?? key,
        product_name: item.product_name ?? '',
        sku: item.sku ?? '',
        quantity_sold: 0,
        revenue_cents: 0,
      }
      entry.quantity_sold += Number(item.quantity ?? 0)
      entry.revenue_cents += safeCents(item.line_total)
      grouped.set(key, entry)
    }
  }

  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.quantity_sold - a.quantity_sold ||
        b.revenue_cents - a.revenue_cents ||
        a.product_name.localeCompare(b.product_name, 'ar'),
    )
    .slice(0, limit)
    .map(({ revenue_cents: revenueCents, ...entry }) => ({
      ...entry,
      revenue: fromCents(revenueCents),
    }))
}

function buildSeries(sales, from, to, groupBy) {
  const keys =
    groupBy === 'month'
      ? enumerateMonthKeys(from, to)
      : enumerateDateKeys(from, to)
  const values = new Map()

  for (const sale of sales) {
    const dateKey = localDateKey(sale.created_at)
    const period = groupBy === 'month' ? dateKey.slice(0, 7) : dateKey
    const entry = values.get(period) ?? { cents: 0, count: 0 }
    entry.cents += safeCents(sale.total_amount)
    entry.count += 1
    values.set(period, entry)
  }

  return keys.map((period) => {
    const entry = values.get(period) ?? { cents: 0, count: 0 }
    return {
      period,
      sales_total: fromCents(entry.cents),
      invoice_count: entry.count,
    }
  })
}

export async function getDashboard() {
  if (isDemoMode()) {
    const today = localDateKey()
    const period = resolveDemoRange(undefined, today, DEFAULT_REPORT_DAYS)
    const sales = getStoredDemoSales()
    const products = getStoredDemoProducts()

    const todaySales = completedSalesInRange(sales, today, today)
    const periodSales = completedSalesInRange(
      sales,
      period.from,
      period.to,
    )
    const todaySummary = summarizeSales(todaySales)
    const periodSummary = summarizeSales(periodSales)

    return {
      today: {
        sales_total: todaySummary.sales_total,
        invoice_count: todaySummary.invoice_count,
      },
      period: {
        from: period.from,
        to: period.to,
        sales_total: periodSummary.sales_total,
        invoice_count: periodSummary.invoice_count,
        average_invoice: periodSummary.average_invoice,
        gross_profit: grossProfit(periodSales),
      },
      low_stock_count: products.filter(
        (product) =>
          product.is_active &&
          Number(product.stock_quantity) <= Number(product.minimum_stock),
      ).length,
      top_products: topProducts(periodSales, 5),
      daily_sales: buildSeries(
        periodSales,
        period.from,
        period.to,
        'day',
      ),
    }
  }

  const response = await api.get('/reports/dashboard')
  return unwrap(response)
}

export async function getSalesReport(params = {}) {
  if (isDemoMode()) {
    const range = resolveDemoRange(params.from, params.to)
    const groupBy = params.group_by === 'month' ? 'month' : 'day'
    const sales = completedSalesInRange(
      getStoredDemoSales(),
      range.from,
      range.to,
    )

    return {
      from: range.from,
      to: range.to,
      group_by: groupBy,
      summary: summarizeSales(sales),
      series: buildSeries(sales, range.from, range.to, groupBy),
    }
  }

  const response = await api.get('/reports/sales', { params })
  return unwrap(response)
}

export async function getTopProducts(params = {}) {
  if (isDemoMode()) {
    const range = resolveDemoRange(params.from, params.to)
    const requestedLimit = Number.parseInt(params.limit, 10) || 10
    const limit = Math.min(50, Math.max(1, requestedLimit))
    const sales = completedSalesInRange(
      getStoredDemoSales(),
      range.from,
      range.to,
    )
    return topProducts(sales, limit)
  }

  const response = await api.get('/reports/top-products', { params })
  return unwrap(response)
}

export async function getInventoryReport() {
  if (isDemoMode()) {
    const products = getStoredDemoProducts()
    const activeProducts = products.filter((product) => product.is_active)

    const lowStockProducts = activeProducts
      .filter(
        (product) =>
          Number(product.stock_quantity) <= Number(product.minimum_stock),
      )
      .sort(
        (a, b) =>
          Number(a.stock_quantity) - Number(b.stock_quantity) ||
          a.name.localeCompare(b.name, 'ar'),
      )
      .slice(0, LOW_STOCK_ITEM_LIMIT)

    const stockValueCents = activeProducts.reduce(
      (total, product) =>
        total +
        safeCents(product.cost_price) * Number(product.stock_quantity ?? 0),
      0,
    )

    return {
      total_products: products.length,
      active_products: activeProducts.length,
      out_of_stock: activeProducts.filter(
        (product) => Number(product.stock_quantity) === 0,
      ).length,
      low_stock: activeProducts.filter(
        (product) =>
          Number(product.stock_quantity) <= Number(product.minimum_stock),
      ).length,
      stock_value_at_cost: fromCents(stockValueCents),
      low_stock_items: lowStockProducts.map((product) => ({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category ?? null,
        stock_quantity: Number(product.stock_quantity),
        minimum_stock: Number(product.minimum_stock),
        value_at_cost: fromCents(
          safeCents(product.cost_price) * Number(product.stock_quantity ?? 0),
        ),
      })),
    }
  }

  const response = await api.get('/reports/inventory')
  return unwrap(response)
}
