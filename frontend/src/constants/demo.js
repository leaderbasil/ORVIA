// Showcase-only demo entry. Vite inlines these values into the public client
// bundle, so never enable this with a real admin account in production.
const demoEmail = (import.meta.env.VITE_DEMO_ADMIN_EMAIL || '').trim()
const demoPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || ''
const demoEnabled =
  (import.meta.env.VITE_DEMO_LOGIN_ENABLED || '').toLowerCase() === 'true'

export const demoLoginEnabled =
  demoEnabled && Boolean(demoEmail) && Boolean(demoPassword)

export const demoCredentials = demoLoginEnabled
  ? { email: demoEmail, password: demoPassword }
  : null
