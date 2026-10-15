import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { startCheckout } from '../lib/billing'
import { errorMessage } from '../lib/me'

interface UpgradePromptProps {
  title?: string
  message: string
  onClose: () => void
}

// Modal shown when a free user hits a Pro-only feature or the free draft limit.
export default function UpgradePrompt({
  title = 'Upgrade to FlowDraft Pro',
  message,
  onClose,
}: UpgradePromptProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setBusy(true)
    setError('')
    try {
      await startCheckout()
    } catch (err) {
      setError(errorMessage(err, 'Could not start checkout. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal mz-upgrade"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mz-upgrade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="mz-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
        <div className="mz-upgrade-icon">
          <Sparkles size={22} />
        </div>
        <h2 id="mz-upgrade-title">{title}</h2>
        <p>{message}</p>
        <ul className="mz-benefits">
          <li>AI sentence variations</li>
          <li>Unlimited drafts</li>
          <li>No ads</li>
        </ul>
        {error && <p className="mz-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Not now</button>
          <button type="button" className="mz-primary" disabled={busy} onClick={handleUpgrade}>
            {busy ? 'Opening checkout...' : 'Upgrade to Pro'}
          </button>
        </div>
        <a className="mz-link" href="/pricing">Compare plans</a>
      </section>
    </div>
  )
}
