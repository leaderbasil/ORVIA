const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
})

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function formatDateTime(value) {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value) {
  if (!value) return '—'
  const date = DATE_ONLY_PATTERN.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  return dateFormatter.format(date)
}

/** Local YYYY-MM-DD for <input type="date"> defaults and report filters. */
export function toDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
