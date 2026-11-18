/**
 * Idempotency keys for POST /sales. The server requires 8-100 characters and
 * keeps the first invoice for a key, so retrying a failed checkout is safe.
 */
export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}
