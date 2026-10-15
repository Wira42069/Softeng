import Stripe from 'stripe'

let client: Stripe | null = null

// Returns null when STRIPE_SECRET_KEY is not set so the app still runs without billing.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  client ??= new Stripe(key)
  return client
}

export function frontendUrl(): string {
  return process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173'
}
