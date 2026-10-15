import { api } from './api'
import { errorCode } from './me'

// Sends the browser to Stripe Checkout. Throws (an axios error) if checkout can't start,
// so callers can show errorMessage(error, ...).
//
// Local development: when Stripe isn't configured on the backend, this falls back to
// POST /api/billing/dev-upgrade, which only works if the backend has ALLOW_DEV_UPGRADE=true.
export async function startCheckout(): Promise<void> {
  try {
    const res = await api.post<{ url: string | null }>('/api/billing/checkout')
    if (!res.data.url) throw new Error('Checkout did not return a link.')
    window.location.assign(res.data.url)
  } catch (error) {
    if (import.meta.env.DEV && errorCode(error) === 'BILLING_NOT_CONFIGURED') {
      try {
        await api.post('/api/billing/dev-upgrade', { plan: 'pro' })
        window.location.assign('/projects?upgraded=1')
        return
      } catch {
        // fall through and report the original "not configured" error
      }
    }
    throw error
  }
}

// Opens Stripe's page where a Pro user can manage or cancel their subscription.
export async function openBillingPortal(): Promise<void> {
  const res = await api.post<{ url: string }>('/api/billing/portal')
  window.location.assign(res.data.url)
}
