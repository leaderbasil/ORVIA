import { messages } from '../constants/messages.js'

export function homePathForRole(role) {
  return role === 'ADMIN' ? '/' : '/pos'
}

const EXACT_PAGE_META = {
  '/': messages.pages.dashboard,
  '/pos': messages.pages.pos,
  '/products': messages.pages.products,
  '/products/new': messages.pages.productNew,
  '/sales': messages.pages.sales,
  '/inventory': messages.pages.inventory,
  '/reports': messages.pages.reports,
  '/users': messages.pages.users,
  '/forbidden': messages.pages.forbidden,
}

const EDIT_PRODUCT_PATH = /^\/products\/[^/]+\/edit$/
const SALE_DETAILS_PATH = /^\/sales\/[^/]+$/

export function pageMetaForPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (EXACT_PAGE_META[path]) return EXACT_PAGE_META[path]
  if (EDIT_PRODUCT_PATH.test(path)) return messages.pages.productEdit
  if (SALE_DETAILS_PATH.test(path)) return messages.pages.saleDetails
  return messages.pages.notFound
}
