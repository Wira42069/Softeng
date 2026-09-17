import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FilePlus2,
  FolderOpen,
  Clock,
  Star,
  Settings,
  LogOut,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { api } from '../lib/api'
import type { DraftSummary } from '../types'

interface UserInfo {
  id: string
  name: string | null
  nickname?: string | null
  email: string
  image: string | null
}

const TOPIC_ACCENT_COLORS: Record<string, string> = {
  education: '#e67e22',
  technology: '#1a7a4f',
  literature: '#8e44ad',
  science: '#2980b9',
  business: '#c0392b',
  philosophy: '#16a085',
  work: '#d4a017',
  career: '#d4a017',
}

const FALLBACK_ACCENT_COLORS = ['#2c3e50', '#7f8c8d', '#6c5ce7', '#b06b2f']
const DAY_IN_MS = 24 * 60 * 60 * 1000

function normalizeTopic(topic?: string | null) {
  return topic?.trim() || 'Uncategorized'
}

function getAccentColor(draft: DraftSummary, index: number) {
  const topic = draft.topic?.trim().toLowerCase() || ''
  const matchedTopic = Object.keys(TOPIC_ACCENT_COLORS).find((key) =>
    topic.includes(key)
  )

  if (matchedTopic) {
    return TOPIC_ACCENT_COLORS[matchedTopic]
  }

  return FALLBACK_ACCENT_COLORS[index % FALLBACK_ACCENT_COLORS.length]
}

// Returns an activity label rather than a misleading % figure,
// since the list endpoint doesn't return word count.
function getActivityStage(draft: DraftSummary): { label: string; pct: number } {
  const created = new Date(draft.createdAt).getTime()
  const updated = new Date(draft.updatedAt).getTime()
  const diff = updated - created
  if (diff < 1000) return { label: 'Not started', pct: 0 }
  if (diff < 60000) return { label: 'Just started', pct: 15 }
  if (diff < 300000) return { label: 'In progress', pct: 40 }
  if (diff < 3600000) return { label: 'Well underway', pct: 70 }
  return { label: 'Actively worked on', pct: 90 }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDeadline(deadline?: string | null) {
  if (!deadline) {
    return 'No deadline'
  }

  return formatDate(deadline)
}

function parseDeadline(deadline?: string | null) {
  if (!deadline) {
    return null
  }

  const dateParts = deadline.split('-').map(Number)
  if (dateParts.length === 3 && dateParts.every(Number.isFinite)) {
    const [year, month, day] = dateParts
    return new Date(year, month - 1, day).setHours(0, 0, 0, 0)
  }

  const timestamp = new Date(deadline).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function getDeadlineStatus(deadlineMs: number) {
  const todayMs = new Date().setHours(0, 0, 0, 0)
  const daysUntilDeadline = Math.round((deadlineMs - todayMs) / DAY_IN_MS)

  if (daysUntilDeadline < 0) {
    const overdueDays = Math.abs(daysUntilDeadline)
    return `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`
  }

  if (daysUntilDeadline === 0) {
    return 'Due today'
  }

  if (daysUntilDeadline === 1) {
    return 'Due tomorrow'
  }

  return `Due in ${daysUntilDeadline} days`
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ProjectsHome() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTopic, setActiveTopic] = useState('All')
  const [sidebarActive, setSidebarActive] = useState('projects')
  const [loading, setLoading] = useState(true)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [prefShowAutosave, setPrefShowAutosave] = useState(() =>
    localStorage.getItem('pref-show-autosave') !== 'false'
  )
  const [prefShowStarred, setPrefShowStarred] = useState(() =>
    localStorage.getItem('pref-show-starred') !== 'false'
  )
  const displayName = user?.nickname?.trim() || user?.name?.trim() || 'there'

  useEffect(() => {
    async function init() {
      try {
        const [userRes, draftsRes] = await Promise.all([
          api.get<UserInfo>('/api/me'),
          api.get<DraftSummary[]>('/api/drafts'),
        ])
        setUser(userRes.data)
        setNicknameDraft(userRes.data.nickname || '')
        setDrafts(draftsRes.data)
      } catch {
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [navigate])

  function handleCreateDraft() {
    navigate('/new-draft')
  }

  async function handleCreateBlankDraft() {
    try {
      const res = await api.post('/api/drafts', {
        title: 'Untitled Draft',
        topic: '',
        deadline: null,
        content: {
          type: 'doc',
          content: [],
        },
      })

      navigate(`/dashboard/${res.data.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleLogout() {
    try {
      await api.post('/api/auth/sign-out')
    } catch {
      // ignore
    }
    navigate('/login')
  }

  async function handleToggleStar(draftId: string, starred: boolean) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId ? { ...draft, starred } : draft
      )
    )

    try {
      await api.patch(`/api/drafts/${draftId}/starred`, { starred })
    } catch {
      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) =>
          draft.id === draftId ? { ...draft, starred: !starred } : draft
        )
      )
    }
  }

  async function handleDeleteDraft(draftId: string) {
    const draftToDelete = drafts.find((draft) => draft.id === draftId)

    if (!draftToDelete || !window.confirm(`Delete "${draftToDelete.title}"? This cannot be undone.`)) {
      return
    }

    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId))

    try {
      await api.delete(`/api/drafts/${draftId}`)
    } catch {
      setDrafts((currentDrafts) => [draftToDelete, ...currentDrafts])
      window.alert('Could not delete this project. Please try again.')
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsStatus('saving')

    try {
      const res = await api.patch<UserInfo>('/api/me', {
        nickname: nicknameDraft,
      })
      setUser(res.data)
      setNicknameDraft(res.data.nickname || '')
      setSettingsStatus('saved')
    } catch {
      setSettingsStatus('error')
    }
  }

  const sortedTopics = Array.from(
    drafts.reduce((topicCounts, draft) => {
      const topic = normalizeTopic(draft.topic)
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      return topicCounts
    }, new Map<string, number>())
  ).sort(([topicA, countA], [topicB, countB]) => {
    if (countA !== countB) {
      return countB - countA
    }

    return topicA.localeCompare(topicB)
  })

  const urgentDeadline = (() => {
    const todayMs = new Date().setHours(0, 0, 0, 0)
    const draftsWithDeadlines = drafts
      .map((draft) => {
        const deadlineMs = parseDeadline(draft.deadline)
        return deadlineMs === null ? null : { draft, deadlineMs }
      })
      .filter((item): item is { draft: DraftSummary; deadlineMs: number } => item !== null)

    const upcomingDrafts = draftsWithDeadlines
      .filter((item) => item.deadlineMs >= todayMs)
      .sort((a, b) => a.deadlineMs - b.deadlineMs)

    if (upcomingDrafts[0]) {
      return upcomingDrafts[0]
    }

    return draftsWithDeadlines
      .sort((a, b) => b.deadlineMs - a.deadlineMs)[0] || null
  })()

  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch =
      !searchQuery ||
      draft.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTopic =
      activeTopic === 'All' ||
      normalizeTopic(draft.topic).toLowerCase() === activeTopic.toLowerCase()
    const matchesSidebar =
      sidebarActive !== 'starred' || draft.starred

    return matchesSearch && matchesTopic && matchesSidebar
  })

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="projects-spinner" />
      </div>
    )
  }

  console.log("Project home drafts:", drafts)

  return (
    <div className="projects-shell">
      {/* ── Sidebar ── */}
      <aside className="projects-sidebar">
        <div className="projects-sidebar-brand">
          <span className="projects-logo-icon">📝</span>
          <span className="projects-logo-text">FlowDraft</span>
        </div>

        <button
          className="projects-create-btn"
          type="button"
          onClick={handleCreateDraft}
        >
          <FilePlus2 size={18} />
          CREATE NEW DRAFT
        </button>

        <nav className="projects-nav">
          <span className="projects-nav-label">Main Menu</span>

          <button
            className={`projects-nav-item ${sidebarActive === 'projects' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setSidebarActive('projects')}
          >
            <FolderOpen size={18} />
            Projects
          </button>

          <button
            className={`projects-nav-item ${sidebarActive === 'starred' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setSidebarActive('starred')}
          >
            <Star size={18} />
            Starred
          </button>

          <button
            className={`projects-nav-item ${sidebarActive === 'settings' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setSidebarActive('settings')}
          >
            <Settings size={18} />
            Settings
          </button>

        </nav>

        <div className="projects-sidebar-footer">
          <button
            className="projects-nav-item logout-btn"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="projects-main">
        {/* ── Top Bar ── */}
        <header className="projects-topbar">
          <h1 className="projects-topbar-title">
            {sidebarActive === 'starred'
              ? 'STARRED'
              : sidebarActive === 'settings'
                ? 'SETTINGS'
                : sidebarActive === 'profile'
                  ? 'PROFILE'
                  : 'PROJECTS'}
          </h1>
          <div className="projects-topbar-actions">
            <label className="projects-search">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={18} />
            </label>

            <button
              className="projects-avatar"
              type="button"
              title={displayName}
              onClick={() => setSidebarActive('profile')}
            >
              {user?.image ? (
                <img src={user.image} alt={displayName} />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </button>
          </div>
        </header>

        {/* ── Content Area ── */}
        <div className="projects-content">
          {sidebarActive === 'settings' || sidebarActive === 'profile' ? (
            <SettingsPanel
              displayName={displayName}
              settingsStatus={settingsStatus}
              user={user}
              nicknameDraft={nicknameDraft}
              prefShowAutosave={prefShowAutosave}
              prefShowStarred={prefShowStarred}
              onNicknameChange={(value) => {
                setNicknameDraft(value)
                setSettingsStatus('idle')
              }}
              onPrefChange={(key, value) => {
                if (key === 'autosave') {
                  setPrefShowAutosave(value)
                  localStorage.setItem('pref-show-autosave', String(value))
                } else {
                  setPrefShowStarred(value)
                  localStorage.setItem('pref-show-starred', String(value))
                }
              }}
              onSubmit={handleSaveSettings}
            />
          ) : (
            <>
          {/* Greeting */}
          <h2 className="projects-greeting">
            Hi, {displayName}!
          </h2>

          {/* Stats Card */}
          <div className="projects-stats-row">
            <div className="projects-stat-card">
              <div className="projects-stat-icon">
                <FolderOpen size={16} />
              </div>
              <span className="projects-stat-label">Projects</span>
              <span className="projects-stat-value">
                {drafts.length}{' '}
                <span className="projects-stat-unit">projects</span>
              </span>
            </div>

            <button
              className="projects-stat-card urgent-deadline-card"
              type="button"
              disabled={!urgentDeadline}
              onClick={() => {
                if (urgentDeadline) {
                  navigate(`/dashboard/${urgentDeadline.draft.id}`)
                }
              }}
            >
              <div className="projects-stat-icon urgent-deadline-icon">
                <Clock size={16} />
              </div>
              <span className="projects-stat-label">Urgent Deadline</span>
              {urgentDeadline ? (
                <>
                  <span className="projects-stat-value urgent-deadline-date">
                    {formatDeadline(urgentDeadline.draft.deadline)}
                  </span>
                  <span className="projects-stat-unit urgent-deadline-meta">
                    {getDeadlineStatus(urgentDeadline.deadlineMs)} - {urgentDeadline.draft.title}
                  </span>
                </>
              ) : (
                <>
                  <span className="projects-stat-value urgent-deadline-date">
                    No deadline
                  </span>
                  <span className="projects-stat-unit urgent-deadline-meta">
                    Add one when creating a draft
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Topics */}
          <section className="projects-topics">
            <h3 className="projects-topics-title">Topics</h3>
            <div className="projects-topics-pills">
              <button
                className={`projects-topic-pill ${activeTopic === 'All' ? 'is-active' : ''}`}
                type="button"
                onClick={() => setActiveTopic('All')}
              >
                All
                <span className="projects-topic-count">{drafts.length}</span>
              </button>
              {sortedTopics.map(([topic, count]) => (
                <button
                  key={topic}
                  className={`projects-topic-pill ${activeTopic === topic ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTopic(topic)}
                >
                  {topic}
                  <span className="projects-topic-count">{count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Project Cards Grid */}
          {filteredDrafts.length === 0 ? (
            <div className="projects-empty">
              <FolderOpen size={48} />
              <p>
                {sidebarActive === 'starred'
                  ? 'No starred projects yet.'
                  : 'No projects yet. Create your first draft!'}
              </p>
              <button
                className="projects-create-btn inline-create"
                type="button"
                onClick={handleCreateDraft}
              >
                <FilePlus2 size={18} />
                CREATE NEW DRAFT
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              <article
                className="project-card create-draft-card"
                onClick={() => void handleCreateBlankDraft()}
              >
                <div className="project-card-body create-draft-body">
                  <FilePlus2 size={40} />
                  <h4>Blank Draft</h4>
                  <p>Start writing immediately</p>
                </div>
              </article>
              {filteredDrafts.map((draft, index) => {
                const wordLabel = getActivityStage(draft).label
                const accentColor = getAccentColor(draft, index)

                return (
                  <article
                    key={draft.id}
                    className="project-card"
                    onClick={() => navigate(`/dashboard/${draft.id}`)}
                  >
                    <div
                      className="project-card-accent"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="project-card-body">
                      <div className="project-card-title-row">
                        <h4 className="project-card-title">{draft.title}</h4>
                        <button
                          className={`project-card-star ${draft.starred ? 'is-starred' : ''}`}
                          type="button"
                          aria-label={draft.starred ? 'Remove from starred' : 'Add to starred'}
                          title={draft.starred ? 'Remove from starred' : 'Add to starred'}
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleToggleStar(draft.id, !draft.starred)
                          }}
                        >
                          <Star size={18} fill={draft.starred ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="project-card-meta">
                        <div className="project-card-progress-row">
                          <span className="project-card-progress-label">
                            {wordLabel}
                          </span>
                          <div className="project-card-avatars">
                            <div
                              className="project-card-avatar-circle"
                              style={{ backgroundColor: accentColor }}
                            >
                              {getInitials(displayName)}
                            </div>
                          </div>
                        </div>
                        <div className="project-card-wordcount">
                            {draft.wordCount?.toLocaleString() ?? 0} words
                          </div>
                      </div>

                      <div className="project-card-footer">
                        <span className="project-card-date">
                          Deadline: {formatDeadline(draft.deadline)}
                        </span>
                        <div className="project-card-footer-actions">
                          <button
                            className="project-card-delete"
                            type="button"
                            aria-label="Delete project"
                            title="Delete project"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDeleteDraft(draft.id)
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={16} className="project-card-arrow" />
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SettingsPanel({
  displayName,
  settingsStatus,
  user,
  nicknameDraft,
  prefShowAutosave,
  prefShowStarred,
  onNicknameChange,
  onPrefChange,
  onSubmit,
}: {
  displayName: string
  settingsStatus: 'idle' | 'saving' | 'saved' | 'error'
  user: UserInfo | null
  nicknameDraft: string
  prefShowAutosave: boolean
  prefShowStarred: boolean
  onNicknameChange: (value: string) => void
  onPrefChange: (key: 'autosave' | 'starred', value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="projects-settings-panel">
      <div className="settings-hero">
        <div className="settings-avatar">
          {user?.image ? (
            <img src={user.image} alt={displayName} />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
        </div>
        <div>
          <h2>{displayName}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={onSubmit}>
        <section className="settings-section">
          <h3>Profile</h3>
          <label className="settings-field">
            <span>Google name</span>
            <input value={user?.name || ''} disabled />
          </label>
          <label className="settings-field">
            <span>Nickname</span>
            <input
              value={nicknameDraft}
              placeholder="Use a custom name on the home page"
              onChange={(event) => onNicknameChange(event.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>Email</span>
            <input value={user?.email || ''} disabled />
          </label>
        </section>

        <section className="settings-section">
          <h3>Writing Preferences</h3>
          <label className="settings-check-row">
            <input
              type="checkbox"
              checked={prefShowAutosave}
              onChange={(e) => onPrefChange('autosave', e.target.checked)}
            />
            <span>Show autosave status while writing</span>
          </label>
          <label className="settings-check-row">
            <input
              type="checkbox"
              checked={prefShowStarred}
              onChange={(e) => onPrefChange('starred', e.target.checked)}
            />
            <span>Keep starred projects visible in quick filters</span>
          </label>
        </section>

        <section className="settings-section">
          <h3>Account</h3>
          <p className="settings-muted">
            Profile and Settings use the same preferences. Saved nickname changes update the home greeting immediately.
          </p>
        </section>

        <div className="settings-actions">
          <button className="settings-save-btn" type="submit" disabled={settingsStatus === 'saving'}>
            {settingsStatus === 'saving' ? 'Saving...' : 'Save settings'}
          </button>
          <span className={`settings-status status-${settingsStatus}`}>
            {settingsStatus === 'saved'
              ? 'Saved'
              : settingsStatus === 'error'
                ? 'Could not save'
                : ''}
          </span>
        </div>
      </form>
    </section>
  )
}
