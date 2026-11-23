import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/me'

interface DeleteAccountDialogProps {
  email: string
  isPro: boolean
  onClose: () => void
}

// Permanent account deletion. The user must type their own email to enable the button, and the
// server checks it again (DELETE /api/me). On success the browser goes back to the home page.
export default function DeleteAccountDialog({ email, isPro, onClose }: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const matches = typed.trim().toLowerCase() === email.toLowerCase()

  function close() {
    if (!busy) onClose()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!matches || busy) return
    setBusy(true)
    setError('')
    try {
      await api.delete('/api/me', { data: { confirmEmail: typed.trim() } })
      // The session no longer exists, so leave the app entirely instead of navigating inside it.
      window.location.assign('/')
    } catch (err) {
      setError(errorMessage(err, 'Could not delete your account. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={close}>
      <section
        className="modal mz-delete-account"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mz-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="mz-close" type="button" aria-label="Close" disabled={busy} onClick={close}>
          <X size={16} />
        </button>
        <h2 id="mz-delete-title">Delete your account?</h2>
        <p>
          This permanently deletes your account, all of your drafts, their version history and your
          saved sources. This cannot be undone.
        </p>
        {isPro && <p>Your Pro subscription will be cancelled immediately.</p>}

        <form onSubmit={handleSubmit}>
          <label className="mz-delete-label" htmlFor="mz-delete-email">
            Type <strong>{email}</strong> to confirm
          </label>
          <input
            id="mz-delete-email"
            type="email"
            autoComplete="off"
            autoFocus
            value={typed}
            disabled={busy}
            onChange={(event) => setTyped(event.target.value)}
          />
          {error && <p className="mz-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" disabled={busy} onClick={close}>Cancel</button>
            <button type="submit" className="mz-danger" disabled={!matches || busy}>
              {busy ? 'Deleting...' : 'Delete my account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
