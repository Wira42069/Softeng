import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startCheckout, openBillingPortal } from '../lib/billing'
import { errorMessage, useMe } from '../lib/me'

// Shown as e.g. "$5" in the Pro card. Set VITE_PRO_PRICE in frontend/.env to match your Stripe price.
const PRO_PRICE = import.meta.env.VITE_PRO_PRICE || '[PRICE]'

export default function Pricing() {
  const navigate = useNavigate()
  const { me, loading } = useMe()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    if (!me) {
      navigate('/login')
      return
    }
    setBusy(true)
    setError('')
    try {
      await startCheckout()
    } catch (err) {
      setError(errorMessage(err, 'Could not start checkout. Please try again.'))
      setBusy(false)
    }
  }

  async function handleManage() {
    setBusy(true)
    setError('')
    try {
      await openBillingPortal()
    } catch (err) {
      setError(errorMessage(err, 'Could not open billing. Please try again.'))
      setBusy(false)
    }
  }

  const isPro = me?.plan === 'pro'

  return (
    <div className="mz-page">
      <nav className="mz-nav">
        <a className="mz-brand" href="/">FlowDraft</a>
        <div className="mz-nav-links">
          <a href="/">Home</a>
          <a className="mz-secondary" href={me ? '/projects' : '/login'}>
            {me ? 'My projects' : 'Log in'}
          </a>
        </div>
      </nav>

      <main className="mz-section">
        <h1 className="mz-h2">Simple pricing</h1>
        <p className="mz-sub">Start free. Upgrade when you want AI help and no limits.</p>

        <div className="mz-plans">
          <section className="mz-plan-card" aria-labelledby="plan-free">
            <h3 id="plan-free">Free</h3>
            <p className="mz-price">$0</p>
            <ul>
              <li>Guided topic, outline and writing flow</li>
              <li>Hierarchical editing and version history</li>
              <li>Citations, DOCX and PDF export</li>
              <li>Up to 5 drafts</li>
              <li className="mz-no">Supported by ads</li>
              <li className="mz-no">No AI sentence variations</li>
            </ul>
            <a className="mz-secondary" href={me ? '/projects' : '/login'}>
              {me ? 'Go to my projects' : 'Start free'}
            </a>
          </section>

          <section className="mz-plan-card mz-plan-card-pro" aria-labelledby="plan-pro">
            <h3 id="plan-pro">Pro</h3>
            <p className="mz-price">
              {PRO_PRICE} <small>/ month</small>
            </p>
            <ul>
              <li>Everything in Free</li>
              <li>AI sentence variations to refine your writing</li>
              <li>Unlimited drafts</li>
              <li>No ads</li>
            </ul>
            {isPro ? (
              <button type="button" className="mz-secondary" disabled={busy} onClick={handleManage}>
                Manage subscription
              </button>
            ) : (
              <button
                type="button"
                className="mz-primary"
                disabled={busy || loading}
                onClick={handleUpgrade}
              >
                {busy ? 'Opening checkout...' : 'Upgrade to Pro'}
              </button>
            )}
            {error && <p className="mz-error" role="alert">{error}</p>}
          </section>
        </div>
      </main>
    </div>
  )
}
