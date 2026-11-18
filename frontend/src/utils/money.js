/**
 * Money helpers for the UI. All arithmetic happens on integer cents so the
 * preview never suffers from floating point drift. The server remains the
 * source of truth for the final invoice.
 */

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/

export function toCents(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).trim()
  if (!MONEY_PATTERN.test(normalized)) {
    throw new Error(`Invalid money value: ${value}`)
  }
  const negative = normalized.startsWith('-')
  const [whole, fraction = ''] = normalized.replace('-', '').split('.')
  const cents = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2))
  return negative ? -cents : cents
}

export function fromCents(cents) {
  const value = Number(cents)
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

export function multiplyCents(cents, quantity) {
  return Number(cents) * Number(quantity)
}

export function sumCents(values) {
  return values.reduce((total, value) => total + Number(value), 0)
}
