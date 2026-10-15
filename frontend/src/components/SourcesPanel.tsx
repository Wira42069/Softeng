import { useState, type FormEvent } from 'react'
import { BookMarked, Pencil, Plus, Quote, Search, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/me'
import {
  CITATION_STYLES,
  emptySource,
  inTextCitation,
  referenceListTitle,
  referenceText,
  type CitationStyle,
  type Source,
} from '../lib/citations'

interface SourcesPanelProps {
  sources: Source[]
  style: CitationStyle
  canInsert: boolean // false outside the Write stage, where there is no editor to insert into
  saveStatus: 'saved' | 'saving' | 'error'
  onChange: (sources: Source[]) => void
  onStyleChange: (style: CitationStyle) => void
  onInsert: (text: string) => void
  onClose: () => void
}

export default function SourcesPanel({
  sources,
  style,
  canInsert,
  saveStatus,
  onChange,
  onStyleChange,
  onInsert,
  onClose,
}: SourcesPanelProps) {
  const [doi, setDoi] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [editing, setEditing] = useState<Source | null>(null)

  async function handleLookup(event: FormEvent) {
    event.preventDefault()
    if (!doi.trim()) return
    setLookupBusy(true)
    setLookupError('')
    try {
      const res = await api.get<{ source: Omit<Source, 'id'> }>('/api/citations/doi', {
        params: { doi: doi.trim() },
      })
      setEditing({ ...emptySource(), ...res.data.source })
      setDoi('')
    } catch (error) {
      setLookupError(errorMessage(error, 'Could not look up that DOI.'))
    } finally {
      setLookupBusy(false)
    }
  }

  function saveEditing(source: Source) {
    const exists = sources.some((item) => item.id === source.id)
    onChange(exists ? sources.map((item) => (item.id === source.id ? source : item)) : [...sources, source])
    setEditing(null)
  }

  return (
    <aside className="mz-drawer" aria-label="Sources and citations">
      <header className="mz-drawer-header">
        <h2>
          <BookMarked size={17} /> Sources
        </h2>
        <span className={`mz-status mz-status-${saveStatus}`}>
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Not saved' : 'Saved'}
        </span>
        <button className="icon-button" type="button" aria-label="Close sources" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <div className="mz-drawer-body">
        <div className="mz-row">
          <label htmlFor="mz-style">Citation style</label>
          <select
            id="mz-style"
            value={style}
            onChange={(event) => onStyleChange(event.target.value as CitationStyle)}
          >
            {CITATION_STYLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <form className="mz-lookup" onSubmit={handleLookup}>
          <label htmlFor="mz-doi">Add by DOI</label>
          <div className="mz-row">
            <input
              id="mz-doi"
              value={doi}
              placeholder="10.1000/xyz123"
              onChange={(event) => setDoi(event.target.value)}
            />
            <button type="submit" className="mz-secondary" disabled={lookupBusy || !doi.trim()}>
              <Search size={14} /> {lookupBusy ? 'Looking up...' : 'Look up'}
            </button>
          </div>
          {lookupError && <p className="mz-error" role="alert">{lookupError}</p>}
        </form>

        <button type="button" className="mz-secondary mz-wide" onClick={() => setEditing(emptySource())}>
          <Plus size={14} /> Add a source manually
        </button>

        {editing && (
          <SourceForm
            source={editing}
            onCancel={() => setEditing(null)}
            onSave={saveEditing}
          />
        )}

        {sources.length === 0 && !editing ? (
          <p className="mz-muted">
            No sources yet. Add one above, then insert an in-text citation while you write. Your
            {' '}{referenceListTitle(style).toLowerCase()} list is added to the preview and exports automatically.
          </p>
        ) : (
          <ul className="mz-source-list">
            {sources.map((source) => (
              <li key={source.id} className="mz-source">
                <p className="mz-source-text">{referenceText(source, style) || 'Untitled source'}</p>
                <div className="mz-source-actions">
                  <button
                    type="button"
                    className="mz-secondary"
                    disabled={!canInsert}
                    title={canInsert ? 'Insert at the cursor' : 'Switch to the Write tab to insert'}
                    onClick={() => onInsert(inTextCitation(source, style))}
                  >
                    <Quote size={13} /> Insert {inTextCitation(source, style)}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Edit source"
                    onClick={() => setEditing(source)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button danger-button"
                    aria-label="Delete source"
                    onClick={() => onChange(sources.filter((item) => item.id !== source.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function SourceForm({
  source,
  onSave,
  onCancel,
}: {
  source: Source
  onSave: (source: Source) => void
  onCancel: () => void
}) {
  const [authors, setAuthors] = useState(source.authors.join('\n'))
  const [title, setTitle] = useState(source.title)
  const [year, setYear] = useState(source.year)
  const [container, setContainer] = useState(source.container)
  const [url, setUrl] = useState(source.url)
  const [doi, setDoi] = useState(source.doi)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave({
      ...source,
      authors: authors.split('\n').map((line) => line.trim()).filter(Boolean),
      title: title.trim(),
      year: year.trim(),
      container: container.trim(),
      url: url.trim(),
      doi: doi.trim(),
    })
  }

  return (
    <form className="mz-form" onSubmit={handleSubmit}>
      <label htmlFor="mz-authors">Authors (one per line, "Family, Given")</label>
      <textarea
        id="mz-authors"
        rows={3}
        value={authors}
        placeholder={'Smith, Jane\nOkafor, Chidi'}
        onChange={(event) => setAuthors(event.target.value)}
      />
      <label htmlFor="mz-title">Title</label>
      <input id="mz-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <div className="mz-row">
        <div className="mz-grow">
          <label htmlFor="mz-year">Year</label>
          <input id="mz-year" value={year} maxLength={10} onChange={(event) => setYear(event.target.value)} />
        </div>
        <div className="mz-grow-2">
          <label htmlFor="mz-container">Journal, website or publisher</label>
          <input id="mz-container" value={container} onChange={(event) => setContainer(event.target.value)} />
        </div>
      </div>
      <label htmlFor="mz-url">URL</label>
      <input id="mz-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
      <label htmlFor="mz-doi-field">DOI</label>
      <input id="mz-doi-field" value={doi} onChange={(event) => setDoi(event.target.value)} />
      <div className="modal-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="mz-primary">Save source</button>
      </div>
    </form>
  )
}
