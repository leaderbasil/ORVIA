// Client-side mock dataset for the fully interactive, frontend-only demo.
// Shapes intentionally match the FastAPI response contracts so the existing
// pages, hooks and tables keep working without a backend or database.
import { fromCents, toCents } from '../utils/money.js'

const STORAGE_NAMESPACE = 'orvia.demo.v2'
const STORAGE_KEYS = {
  products: `${STORAGE_NAMESPACE}.products`,
  sales: `${STORAGE_NAMESPACE}.sales`,
  users: `${STORAGE_NAMESPACE}.users`,
}
const LEGACY_STORAGE_KEYS = ['orvia.demo.products', 'orvia.demo.sales']

export const DEMO_ADMIN_ID = 'demo-admin-id'
const DEMO_ADMIN_NAME = 'Demo Admin'
const DEMO_ADMIN_EMAIL = 'demo@orvia.local'
const DEMO_CASHIER_ID = 'demo-cashier-id'

function isoDaysAgo(days, hour = 9, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function clearLegacyStorage() {
  if (typeof localStorage === 'undefined') return
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage may be unavailable in private browsing; the demo still works
      // for the current page session with the seeded data.
    }
  }
}

clearLegacyStorage()

const INITIAL_DEMO_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'حليب طازج 1 لتر',
    sku: 'DEMO-MILK-1L',
    barcode: '628100100101',
    category: 'ألبان وأجبان',
    unit: 'liter',
    cost_price: '1.20',
    selling_price: '1.75',
    stock_quantity: 45,
    minimum_stock: 10,
    is_active: true,
    created_at: isoDaysAgo(90, 8),
    updated_at: isoDaysAgo(3, 8),
  },
  {
    id: 'prod-2',
    name: 'خبز عربي أبيض (كيس)',
    sku: 'DEMO-BREAD',
    barcode: '628100100102',
    category: 'مخبوزات',
    unit: 'piece',
    cost_price: '0.75',
    selling_price: '1.00',
    stock_quantity: 80,
    minimum_stock: 15,
    is_active: true,
    created_at: isoDaysAgo(88, 8),
    updated_at: isoDaysAgo(2, 8),
  },
  {
    id: 'prod-3',
    name: 'بيض طازج (طبق 12 بيضة)',
    sku: 'DEMO-EGGS-12',
    barcode: '628100100103',
    category: 'ألبان وأجبان',
    unit: 'piece',
    cost_price: '2.50',
    selling_price: '3.50',
    stock_quantity: 30,
    minimum_stock: 8,
    is_active: true,
    created_at: isoDaysAgo(85, 8),
    updated_at: isoDaysAgo(4, 8),
  },
  {
    id: 'prod-4',
    name: 'أرز بسمكي فاخر 5 كجم',
    sku: 'DEMO-RICE-5KG',
    barcode: '628100100104',
    category: 'حبوب ومواد جافة',
    unit: 'piece',
    cost_price: '7.00',
    selling_price: '9.50',
    stock_quantity: 25,
    minimum_stock: 5,
    is_active: true,
    created_at: isoDaysAgo(80, 8),
    updated_at: isoDaysAgo(5, 8),
  },
  {
    id: 'prod-5',
    name: 'زيت نباتي للقلي 1.5 لتر',
    sku: 'DEMO-OIL-1L',
    barcode: '628100100105',
    category: 'زيوت وسمن',
    unit: 'liter',
    cost_price: '3.20',
    selling_price: '4.50',
    stock_quantity: 4,
    minimum_stock: 10,
    is_active: true,
    created_at: isoDaysAgo(75, 8),
    updated_at: isoDaysAgo(1, 8),
  },
  {
    id: 'prod-6',
    name: 'مياه صحية معبأة (كرتونة 24 زجاجة)',
    sku: 'DEMO-WATER-15L',
    barcode: '628100100106',
    category: 'مشروبات ومياه',
    unit: 'piece',
    cost_price: '4.00',
    selling_price: '6.00',
    stock_quantity: 60,
    minimum_stock: 12,
    is_active: true,
    created_at: isoDaysAgo(70, 8),
    updated_at: isoDaysAgo(6, 8),
  },
  {
    id: 'prod-7',
    name: 'شاي أسود ثقيل 250 جرام',
    sku: 'DEMO-TEA-250',
    barcode: '628100100107',
    category: 'مشروبات ومياه',
    unit: 'piece',
    cost_price: '1.80',
    selling_price: '2.75',
    stock_quantity: 0,
    minimum_stock: 5,
    is_active: true,
    created_at: isoDaysAgo(65, 8),
    updated_at: isoDaysAgo(1, 8),
  },
  {
    id: 'prod-8',
    name: 'عسل نحل طبيعي 500 جرام',
    sku: 'DEMO-HONEY-500',
    barcode: '628100100108',
    category: 'محليات ومعلبات',
    unit: 'piece',
    cost_price: '6.50',
    selling_price: '9.00',
    stock_quantity: 15,
    minimum_stock: 4,
    is_active: true,
    created_at: isoDaysAgo(60, 8),
    updated_at: isoDaysAgo(7, 8),
  },
]

const INITIAL_DEMO_USERS = [
  {
    id: DEMO_ADMIN_ID,
    full_name: DEMO_ADMIN_NAME,
    email: DEMO_ADMIN_EMAIL,
    role: 'ADMIN',
    is_active: true,
    created_at: isoDaysAgo(120, 8),
    updated_at: isoDaysAgo(2, 8),
  },
  {
    id: DEMO_CASHIER_ID,
    full_name: 'سالم الكاشير',
    email: 'cashier@orvia.local',
    role: 'CASHIER',
    is_active: true,
    created_at: isoDaysAgo(45, 8),
    updated_at: isoDaysAgo(3, 8),
  },
]

function findInitialProduct(productId) {
  return INITIAL_DEMO_PRODUCTS.find((product) => product.id === productId)
}

function buildDemoSale({
  id,
  sequence,
  daysAgo,
  hour,
  minute = 15,
  status = 'COMPLETED',
  paymentMethod = 'CASH',
  discount = '0.00',
  items,
}) {
  const lines = items.map((item, index) => {
    const product = findInitialProduct(item.productId)
    const lineTotal = fromCents(toCents(product.selling_price) * item.quantity)
    return {
      id: `${id}-item-${index + 1}`,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unit_price: product.selling_price,
      unit_cost: product.cost_price,
      line_total: lineTotal,
    }
  })

  const subtotalCents = lines.reduce(
    (total, line) => total + toCents(line.line_total),
    0,
  )
  const discountCents = Math.min(toCents(discount), subtotalCents)
  const taxCents = 0
  const totalCents = subtotalCents - discountCents + taxCents
  const year = new Date().getFullYear()

  return {
    id,
    invoice_number: `INV-${year}-${String(sequence).padStart(6, '0')}`,
    status,
    cashier: { id: DEMO_ADMIN_ID, full_name: DEMO_ADMIN_NAME },
    subtotal: fromCents(subtotalCents),
    discount_amount: fromCents(discountCents),
    tax_amount: fromCents(taxCents),
    total_amount: fromCents(totalCents),
    payment_method: paymentMethod,
    created_at: isoDaysAgo(daysAgo, hour, minute),
    item_count: lines.length,
    items: lines,
  }
}

const INITIAL_DEMO_SALES = [
  buildDemoSale({
    id: 'sale-101',
    sequence: 1,
    daysAgo: 29,
    hour: 9,
    items: [
      { productId: 'prod-1', quantity: 1 },
      { productId: 'prod-2', quantity: 1 },
      { productId: 'prod-6', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-102',
    sequence: 2,
    daysAgo: 26,
    hour: 10,
    paymentMethod: 'CARD',
    discount: '1.00',
    items: [
      { productId: 'prod-8', quantity: 1 },
      { productId: 'prod-7', quantity: 2 },
    ],
  }),
  buildDemoSale({
    id: 'sale-103',
    sequence: 3,
    daysAgo: 23,
    hour: 11,
    items: [
      { productId: 'prod-3', quantity: 2 },
      { productId: 'prod-6', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-104',
    sequence: 4,
    daysAgo: 20,
    hour: 12,
    paymentMethod: 'CARD',
    items: [
      { productId: 'prod-4', quantity: 1 },
      { productId: 'prod-2', quantity: 3 },
    ],
  }),
  buildDemoSale({
    id: 'sale-105',
    sequence: 5,
    daysAgo: 17,
    hour: 13,
    status: 'CANCELLED',
    items: [
      { productId: 'prod-1', quantity: 1 },
      { productId: 'prod-8', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-106',
    sequence: 6,
    daysAgo: 14,
    hour: 10,
    items: [
      { productId: 'prod-5', quantity: 2 },
      { productId: 'prod-7', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-107',
    sequence: 7,
    daysAgo: 10,
    hour: 15,
    paymentMethod: 'CARD',
    items: [
      { productId: 'prod-6', quantity: 2 },
      { productId: 'prod-3', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-108',
    sequence: 8,
    daysAgo: 8,
    hour: 16,
    items: [
      { productId: 'prod-1', quantity: 3 },
      { productId: 'prod-2', quantity: 2 },
    ],
  }),
  buildDemoSale({
    id: 'sale-109',
    sequence: 9,
    daysAgo: 5,
    hour: 9,
    paymentMethod: 'CARD',
    discount: '2.00',
    items: [
      { productId: 'prod-4', quantity: 2 },
      { productId: 'prod-8', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-110',
    sequence: 10,
    daysAgo: 3,
    hour: 18,
    items: [
      { productId: 'prod-3', quantity: 1 },
      { productId: 'prod-5', quantity: 1 },
      { productId: 'prod-7', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-111',
    sequence: 11,
    daysAgo: 1,
    hour: 12,
    paymentMethod: 'CARD',
    items: [
      { productId: 'prod-6', quantity: 1 },
      { productId: 'prod-2', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-112',
    sequence: 12,
    daysAgo: 1,
    hour: 17,
    items: [
      { productId: 'prod-8', quantity: 1 },
      { productId: 'prod-1', quantity: 2 },
    ],
  }),
  buildDemoSale({
    id: 'sale-113',
    sequence: 13,
    daysAgo: 0,
    hour: 9,
    items: [
      { productId: 'prod-4', quantity: 1 },
      { productId: 'prod-5', quantity: 1 },
    ],
  }),
  buildDemoSale({
    id: 'sale-114',
    sequence: 14,
    daysAgo: 0,
    hour: 10,
    paymentMethod: 'CARD',
    items: [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-3', quantity: 1 },
    ],
  }),
]

function readCollection(key, seed) {
  const fallback = () => clone(seed)
  if (typeof localStorage === 'undefined') {
    return fallback()
  }

  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      const seeded = fallback()
      localStorage.setItem(key, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback()
  } catch {
    const seeded = fallback()
    try {
      localStorage.setItem(key, JSON.stringify(seeded))
    } catch {
      // Ignore storage failures and keep the page usable.
    }
    return seeded
  }
}

function writeCollection(key, value) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures (private browsing, quota, etc.).
  }
}

export function getStoredDemoProducts() {
  return readCollection(STORAGE_KEYS.products, INITIAL_DEMO_PRODUCTS)
}

export function saveDemoProducts(products) {
  writeCollection(STORAGE_KEYS.products, products)
}

export function getStoredDemoSales() {
  return readCollection(STORAGE_KEYS.sales, INITIAL_DEMO_SALES)
}

export function saveDemoSales(sales) {
  writeCollection(STORAGE_KEYS.sales, sales)
}

export function getStoredDemoUsers() {
  return readCollection(STORAGE_KEYS.users, INITIAL_DEMO_USERS)
}

export function saveDemoUsers(users) {
  writeCollection(STORAGE_KEYS.users, users)
}

/**
 * Make sure the locally logged-in demo admin exists in the users collection.
 * The email follows the configured demo account, while an edited full name is
 * preserved so the Users page and the header stay in sync.
 */
export function ensureDemoAdmin({ email = DEMO_ADMIN_EMAIL } = {}) {
  const normalizedEmail = String(email || DEMO_ADMIN_EMAIL).trim().toLowerCase()
  const users = getStoredDemoUsers()
  const index = users.findIndex((user) => user.id === DEMO_ADMIN_ID)
  const now = new Date().toISOString()

  if (index === -1) {
    const admin = {
      id: DEMO_ADMIN_ID,
      full_name: DEMO_ADMIN_NAME,
      email: normalizedEmail,
      role: 'ADMIN',
      is_active: true,
      created_at: now,
      updated_at: now,
    }
    users.unshift(admin)
    saveDemoUsers(users)
    return clone(admin)
  }

  const admin = users[index]
  let changed = false

  if (admin.email !== normalizedEmail) {
    admin.email = normalizedEmail
    changed = true
  }
  if (!admin.is_active) {
    admin.is_active = true
    changed = true
  }
  if (changed) {
    admin.updated_at = now
    saveDemoUsers(users)
  }

  return clone(admin)
}

export function getDemoAdminUser() {
  const users = getStoredDemoUsers()
  const admin = users.find((user) => user.id === DEMO_ADMIN_ID)
  return admin ? clone(admin) : ensureDemoAdmin()
}
