import express, { Router, type Request, type RequestHandler, type Response } from 'express'
import type Stripe from 'stripe'
import { prisma } from '../lib/prisma.js'
import { requireUser, userOf } from '../lib/guards.js'
import { frontendUrl, getStripe } from '../lib/stripe.js'

export const billingRouter = Router()

const NOT_CONFIGURED = {
  error: 'Billing is not configured yet.',
  code: 'BILLING_NOT_CONFIGURED',
}

// Statuses that keep Pro access. past_due is a short grace period while Stripe retries payment.
const PRO_STATUSES = new Set(['active', 'trialing', 'past_due'])

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

// Start a subscription checkout. The frontend redirects the browser to the returned url.
billingRouter.post('/checkout', requireUser, async (_req, res) => {
  try {
    const stripe = getStripe()
    const priceId = process.env.STRIPE_PRICE_ID
    if (!stripe || !priceId) return res.status(503).json(NOT_CONFIGURED)

    const user = userOf(res)
    if (user.isPro) {
      return res.status(400).json({ error: 'You are already on the Pro plan.' })
    }

    const frontend = frontendUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      success_url: `${frontend}/projects?upgraded=1`,
      cancel_url: `${frontend}/pricing`,
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Checkout failed', error)
    res.status(500).json({ error: 'Could not start checkout. Please try again.' })
  }
})

// Stripe-hosted page where Pro users manage or cancel their subscription.
billingRouter.post('/portal', requireUser, async (_req, res) => {
  try {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json(NOT_CONFIGURED)

    const user = userOf(res)
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found for this user.' })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl()}/projects`,
    })
    res.json({ url: portal.url })
  } catch (error) {
    console.error('Billing portal failed', error)
    res.status(500).json({ error: 'Could not open the billing portal.' })
  }
})

// Local testing only: flips the current user between free and pro without Stripe.
// Disabled unless ALLOW_DEV_UPGRADE=true, and always disabled in production.
billingRouter.post('/dev-upgrade', requireUser, async (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_UPGRADE !== 'true') {
    return res.status(404).json({ error: 'Not found' })
  }
  try {
    const plan = req.body?.plan === 'free' ? 'free' : 'pro'
    await prisma.user.update({ where: { id: userOf(res).id }, data: { plan } })
    res.json({ plan })
  } catch (error) {
    console.error('Dev upgrade failed', error)
    res.status(500).json({ error: 'Could not change plan.' })
  }
})

// Stripe sends the signed event as raw bytes, so this is mounted BEFORE express.json().
async function handleWebhook(req: Request, res: Response) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return res.status(503).json(NOT_CONFIGURED)

  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') return res.status(400).send('Missing signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret)
  } catch {
    return res.status(400).send('Invalid signature')
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (userId) {
          await prisma.user.updateMany({
            where: { id: userId },
            data: {
              plan: 'pro',
              stripeCustomerId: idOf(session.customer),
              stripeSubscriptionId: idOf(session.subscription),
            },
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = idOf(subscription.customer)
        if (customerId) {
          const keepsPro =
            event.type === 'customer.subscription.updated' &&
            PRO_STATUSES.has(subscription.status)
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              plan: keepsPro ? 'pro' : 'free',
              stripeSubscriptionId: keepsPro ? subscription.id : null,
            },
          })
        }
        break
      }
      default:
        break
    }
    res.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler failed', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

export const stripeWebhook: RequestHandler[] = [
  express.raw({ type: 'application/json' }),
  handleWebhook,
]
