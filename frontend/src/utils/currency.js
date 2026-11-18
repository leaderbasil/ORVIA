import { toCents } from './money'

export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || 'USD'

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plainNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoneyFromCents(cents) {
  return formatter.format(Number(cents) / 100)
}

/** Format a server money string (e.g. "12.50") without float arithmetic. */
export function formatMoneyValue(value) {
  return formatMoneyFromCents(toCents(value))
}

export function formatNumberFromCents(cents) {
  return plainNumberFormatter.format(Number(cents) / 100)
}
