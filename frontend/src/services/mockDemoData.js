// Client-side mock demo dataset for fully interactive presentation mode on Netlify.

const INITIAL_DEMO_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'حليب طازج 1 لتر',
    sku: 'DEMO-MILK-1L',
    barcode: '628100100101',
    category: 'ألبان وأجبان',
    unit: 'لتر',
    cost_price: '1.20',
    selling_price: '1.75',
    stock_quantity: 45,
    minimum_stock: 10,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'خبز عربي أبيض (كيس)',
    sku: 'DEMO-BREAD',
    barcode: '628100100102',
    category: 'مخبوزات',
    unit: 'كيس',
    cost_price: '0.75',
    selling_price: '1.00',
    stock_quantity: 80,
    minimum_stock: 15,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'بيض طازج (طبق 12 بيضة)',
    sku: 'DEMO-EGGS-12',
    barcode: '628100100103',
    category: 'ألبان وأجبان',
    unit: 'طبق',
    cost_price: '2.50',
    selling_price: '3.50',
    stock_quantity: 30,
    minimum_stock: 8,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'أرز بسمكي فاخر 5 كجم',
    sku: 'DEMO-RICE-5KG',
    barcode: '628100100104',
    category: 'حبوب ومواد جافة',
    unit: 'كيس',
    cost_price: '7.00',
    selling_price: '9.50',
    stock_quantity: 25,
    minimum_stock: 5,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'زيت نباتي للقلي 1.5 لتر',
    sku: 'DEMO-OIL-1L',
    barcode: '628100100105',
    category: 'زيوت وسمن',
    unit: 'زجاجة',
    cost_price: '3.20',
    selling_price: '4.50',
    stock_quantity: 4, // Low stock demo item
    minimum_stock: 10,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'مياه صحية معبأة (كرتونة 24 زجاجة)',
    sku: 'DEMO-WATER-15L',
    barcode: '628100100106',
    category: 'مشروبات ومياه',
    unit: 'كرتونة',
    cost_price: '4.00',
    selling_price: '6.00',
    stock_quantity: 60,
    minimum_stock: 12,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'شاي أسود ثقيل 250 جرام',
    sku: 'DEMO-TEA-250',
    barcode: '628100100107',
    category: 'مشروبات ومياه',
    unit: 'علبة',
    cost_price: '1.80',
    selling_price: '2.75',
    stock_quantity: 0, // Out of stock demo item
    minimum_stock: 5,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    name: 'عسل نحل طبيعي 500 جرام',
    sku: 'DEMO-HONEY-500',
    barcode: '628100100108',
    category: 'محليات ومعلبات',
    unit: 'برطمان',
    cost_price: '6.50',
    selling_price: '9.00',
    stock_quantity: 15,
    minimum_stock: 4,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

const INITIAL_DEMO_SALES = [
  {
    id: 'sale-101',
    invoice_number: 'INV-2026-0001',
    status: 'COMPLETED',
    subtotal: '12.50',
    tax_total: '0.00',
    grand_total: '12.50',
    amount_tendered: '15.00',
    change_amount: '2.50',
    payment_method: 'CASH',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    seller: { full_name: 'Demo Admin', email: 'admin@example.com' },
    items: [
      { id: 'item-1', product_name: 'حليب طازج 1 لتر', quantity: 2, unit_price: '1.75', line_total: '3.50' },
      { id: 'item-2', product_name: 'أرز بسمكي فاخر 5 كجم', quantity: 1, unit_price: '9.50', line_total: '9.50' },
    ],
  },
  {
    id: 'sale-102',
    invoice_number: 'INV-2026-0002',
    status: 'COMPLETED',
    subtotal: '7.00',
    tax_total: '0.00',
    grand_total: '7.00',
    amount_tendered: '10.00',
    change_amount: '3.00',
    payment_method: 'CARD',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    seller: { full_name: 'Demo Admin', email: 'admin@example.com' },
    items: [
      { id: 'item-3', product_name: 'مياه صحية معبأة (كرتونة 24 زجاجة)', quantity: 1, unit_price: '6.00', line_total: '6.00' },
      { id: 'item-4', product_name: 'خبز عربي أبيض (كيس)', quantity: 1, unit_price: '1.00', line_total: '1.00' },
    ],
  },
]

export function getStoredDemoProducts() {
  try {
    const raw = localStorage.getItem('orvia.demo.products')
    if (!raw) {
      localStorage.setItem('orvia.demo.products', JSON.stringify(INITIAL_DEMO_PRODUCTS))
      return INITIAL_DEMO_PRODUCTS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_DEMO_PRODUCTS
  }
}

export function saveDemoProducts(products) {
  try {
    localStorage.setItem('orvia.demo.products', JSON.stringify(products))
  } catch {}
}

export function getStoredDemoSales() {
  try {
    const raw = localStorage.getItem('orvia.demo.sales')
    if (!raw) {
      localStorage.setItem('orvia.demo.sales', JSON.stringify(INITIAL_DEMO_SALES))
      return INITIAL_DEMO_SALES
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_DEMO_SALES
  }
}

export function saveDemoSales(sales) {
  try {
    localStorage.setItem('orvia.demo.sales', JSON.stringify(sales))
  } catch {}
}
