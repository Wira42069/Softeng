import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { errorMessage, useMe } from '../lib/me'

interface FeedbackItem {
  id: string
  email: string | null
  message: string
  createdAt: string
}

// Admin-only inbox for user feedback ("admin-client interaction" in the BMC).
// Admins are users with role "admin", or whose email is in the backend ADMIN_EMAILS list.
export default function Admin() {
  const { me, loading } = useMe()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)
  const isAdmin = me?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    async function load() {
      setFetching(true)
      try {
        const res = await api.get<FeedbackItem[]>('/api/admin/feedback')
        if (!cancelled) setItems(res.data)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Could not load feedback.'))
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this feedback?')) return
    try {
      await api.delete(`/api/admin/feedback/${id}`)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(errorMessage(err, 'Could not delete that item.'))
    }
  }

  if (loading) return <div className="mz-page mz-admin"><p className="mz-muted">Loading...</p></div>

  if (!me) {
    return (
      <div className="mz-page mz-admin">
        <h1>Admin</h1>
        <p>Please <a href="/login">log in</a> to continue.</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mz-page mz-admin">
        <h1>Admin</h1>
        <p>You do not have access to this page.</p>
        <a className="mz-secondary" href="/projects">Back to projects</a>
      </div>
    )
  }

  return (
    <div className="mz-page">
      <div className="mz-admin">
        <h1>User feedback</h1>
        {error && <p className="mz-error" role="alert">{error}</p>}
        {fetching && <p className="mz-muted">Loading...</p>}
        {!fetching && items.length === 0 && !error && <p className="mz-muted">No feedback yet.</p>}
        <ul className="mz-feedback-list">
          {items.map((item) => (
            <li key={item.id} className="mz-feedback-item">
              <div className="mz-feedback-meta">
                <span>{item.email ?? 'Unknown user'}</span>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </div>
              <p className="mz-feedback-text">{item.message}</p>
              <button type="button" className="mz-secondary" onClick={() => handleDelete(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/projects">Back to projects</a>
        </p>
      </div>
    </div>
  )
}
