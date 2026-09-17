import { useEffect, useState } from 'react'
import { History, RotateCcw, X } from 'lucide-react'
import { api } from '../lib/api'
import type { DraftDetail } from '../types'

interface Version {
  id: string
  createdAt: string
}

interface VersionsPanelProps {
  draftId: string
  onClose: () => void
  onRestore: (draft: DraftDetail) => void
}

export default function VersionsPanel({ draftId, onClose, onRestore }: VersionsPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVersions() {
      setLoading(true)
      try {
        const res = await api.get<Version[]>(`/api/drafts/${draftId}/versions`)
        setVersions(res.data)
      } catch (error) {
        console.error('Failed to fetch versions', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (draftId) {
      void fetchVersions()
    }
  }, [draftId])

  async function handleRestore(versionId: string) {
    if (!window.confirm('Are you sure you want to restore this version? Your current progress will be saved as a new version.')) {
      return
    }

    setRestoringId(versionId)
    try {
      const res = await api.post<DraftDetail>(`/api/drafts/${draftId}/restore/${versionId}`)
      onRestore(res.data)
      onClose()
    } catch (error) {
      console.error('Failed to restore version', error)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <aside className="versions-panel">
      <header className="versions-header">
        <div className="versions-title">
          <History size={16} />
          <h3>Version History</h3>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close versions">
          <X size={16} />
        </button>
      </header>
      
      <div className="versions-list" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <p className="muted-copy">Loading history...</p>
        ) : versions.length === 0 ? (
          <p className="muted-copy">No previous versions found.</p>
        ) : (
          versions.map((version, index) => (
            <article key={version.id} className="version-item" style={{ padding: '12px', background: 'var(--panel-strong)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>{index === 0 ? 'Latest (Now)' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(version.createdAt))}</strong>
              </div>
              {index > 0 && (
                <button 
                  className="soft-button compact-button" 
                  type="button" 
                  disabled={restoringId !== null}
                  onClick={() => handleRestore(version.id)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <RotateCcw size={14} />
                  {restoringId === version.id ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </aside>
  )
}
