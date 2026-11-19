import { TOKEN_STORAGE_KEY } from './api'

export const DEMO_TOKEN = 'demo-mock-access-token-orvia'

export function isDemoMode() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) === DEMO_TOKEN
}

/** Mimic the backend error shape so existing error handling keeps working. */
export function demoError(code, status = 400) {
  const error = new Error(code)
  error.response = { status, data: { code } }
  return error
}

export function parseDemoBoolean(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

export function localDateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return localDateKey()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey, delta) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + delta)
  return localDateKey(date)
}

export function enumerateDateKeys(from, to) {
  const keys = []
  let current = from
  while (current <= to) {
    keys.push(current)
    current = addDays(current, 1)
  }
  return keys
}

export function enumerateMonthKeys(from, to) {
  const keys = []
  let year = Number(from.slice(0, 4))
  let month = Number(from.slice(5, 7))
  const endYear = Number(to.slice(0, 4))
  const endMonth = Number(to.slice(5, 7))

  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month === 13) {
      month = 1
      year += 1
    }
  }
  return keys
}

export function resolveDemoRange(from, to, defaultDays = 30) {
  const dateTo = to || localDateKey()
  const dateFrom = from || addDays(dateTo, -(defaultDays - 1))
  if (dateFrom > dateTo) {
    throw demoError('INVALID_DATE_RANGE')
  }
  return { from: dateFrom, to: dateTo }
}

export function paginateDemoItems(items, params = {}, defaultPageSize = 20) {
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(params.page_size, 10) || defaultPageSize),
  )
  const start = (page - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
  }
}
