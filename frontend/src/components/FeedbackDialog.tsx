import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/me'

// "Customer support & feedback" from the BMC. Messages are stored and shown on /admin.
export default function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    setError('')
    try {
      await api.post('/api/feedback', { message })
      setStatus('sent')
    } catch (err) {
      setError(errorMessage(err, 'Could not send feedback. Please try again.'))
      setStatus('idle')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal mz-feedback"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mz-feedback-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="mz-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
        <h2 id="mz-feedback-title">Send feedback</h2>

        {status === 'sent' ? (
          <>
            <p>Thank you. Your message has been sent to the FlowDraft team.</p>
            <div className="modal-actions">
              <button type="button" className="mz-primary" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p>Found a bug, or have an idea? Tell us.</p>
            <label className="mz-sr-only" htmlFor="mz-feedback-text">Your feedback</label>
            <textarea
              id="mz-feedback-text"
              rows={5}
              maxLength={2000}
              value={message}
              placeholder="What is on your mind?"
              onChange={(event) => setMessage(event.target.value)}
            />
            {error && <p className="mz-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="mz-primary"
                disabled={status === 'sending' || !message.trim()}
              >
                {status === 'sending' ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
