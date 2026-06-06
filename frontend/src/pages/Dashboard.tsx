import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Download, History, Menu } from 'lucide-react'
import EditorPanel from '../components/EditorPanel.tsx'
import Sidebar from '../components/Sidebar.tsx'
import VersionsPanel from '../components/VersionsPanel.tsx'
import html2pdf from 'html2pdf.js'
import { api } from '../lib/api'
import {
  addOutlineHeading,
  buildDocxBlob,
  countCharacters,
  countWords,
  docToSentenceItems,
  docToText,
  emptyDoc,
  ensureParagraphWorkspaces,
  extractOutline,
  makeSentenceVariations,
  deleteOutlineBlock,
  moveOutlineBlock,
  normalizeDoc,
  renameOutlineHeading,
  sentencesToDoc,
  serializeDoc,
  docToPreviewBlocks,
} from '../lib/document'
import type { DraftDetail, DraftSummary, SaveStatus, SentenceItem, TipTapDoc, EditorMode, WorkflowStage } from '../types'

type PendingAction =
  | { type: 'select'; draftId: string }
  | { type: 'create' }


export default function Dashboard() {
  const { draftId } = useParams<{ draftId: string }>()
  const navigate = useNavigate()

  const [activeSentence, setActiveSentence] = useState<SentenceItem | null>(null)
  const [content, setContent] = useState<TipTapDoc>(emptyDoc)
  const [draft, setDraft] = useState<DraftDetail | null>(null)
  const [mode, setMode] = useState<EditorMode>('production')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [savedContentKey, setSavedContentKey] = useState(serializeDoc(emptyDoc))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [title, setTitle] = useState('Untitled Draft')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [variations, setVariations] = useState<string[]>([])
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('draft')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('flowdraft-onboarded') !== 'true')
  const [focusMode, setFocusMode] = useState(false)
  const selectedDraftId = draft?.id ?? null
  const contentKey = serializeDoc(content)
  const contentDirty = Boolean(selectedDraftId) && contentKey !== savedContentKey
  const titleDirty = draft !== null && title.trim() !== draft.title
  const isDirty = contentDirty || titleDirty
  const wordCount = countWords(content)
  const characterCount = countCharacters(content)
  const outlineItems = extractOutline(content)
  // Stable refs so effects always call the latest version of these functions
  // without needing them in dependency arrays (replaces experimental useEffectEvent).
  const saveContentRef = useRef(saveContent)
  const renameDraftRef = useRef(renameDraft)
  const loadDraftsRef = useRef(loadDrafts)
  useEffect(() => { saveContentRef.current = saveContent })
  useEffect(() => { renameDraftRef.current = renameDraft })
  useEffect(() => { loadDraftsRef.current = loadDrafts })

  useEffect(() => {
    loadDraftsRef.current()
  }, [])

  useEffect(() => {
    if (draftId) {
      void loadDraft(draftId)
    } else {
      setDraft(null)
      setContent(emptyDoc)
      setSavedContentKey(serializeDoc(emptyDoc))
      setTitle('Untitled Draft')
      setUpdatedAt(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  useEffect(() => {
    if (!selectedDraftId || !contentDirty || saveStatus === 'saving' || saveStatus === 'conflict') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void saveContentRef.current(content, false)
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, contentDirty, saveStatus, selectedDraftId, updatedAt])

  useEffect(() => {
    if (!selectedDraftId || !titleDirty || saveStatus === 'conflict') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void renameDraftRef.current()
    }, 900)

    return () => window.clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraftId, title, titleDirty, saveStatus])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveContentRef.current(content, false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  async function loadDrafts() {
    const res = await api.get<DraftSummary[]>('/api/drafts')

    if (!draftId && res.data[0]) {
      navigate(`/dashboard/${res.data[0].id}`, { replace: true })
    }
  }

  async function loadDraft(idToLoad: string) {
    const res = await api.get<DraftDetail>(`/api/drafts/${idToLoad}`)
    const nextContent = ensureParagraphWorkspaces(normalizeDoc(res.data.content))

    setActiveSentence(null)
    setContent(nextContent)
    setDraft(res.data)
    setSavedContentKey(serializeDoc(nextContent))
    setSaveStatus('saved')
    setTitle(res.data.title)
    setUpdatedAt(res.data.updatedAt)
    setVariations([])
    setShowVersions(false)
  }

  async function saveContent(nextContent: TipTapDoc, overwriteConflict: boolean) {
    if (!selectedDraftId) {
      return
    }

    if (!overwriteConflict && serializeDoc(nextContent) === savedContentKey) {
      setSaveStatus('saved')
      return
    }

    setSaveStatus('saving')

    try {
      const res = await api.put<{ draft: DraftDetail }>(`/api/drafts/${selectedDraftId}/content`, {
        content: nextContent,
        lastKnownUpdatedAt: overwriteConflict ? undefined : updatedAt,
      })

      const savedDoc = normalizeDoc(res.data.draft.content)
      setContent(savedDoc)
      setDraft(res.data.draft)
      setSavedContentKey(serializeDoc(savedDoc))
      setSaveStatus('saved')
      setUpdatedAt(res.data.draft.updatedAt)
      await loadDrafts()
    } catch (error) {
      if (isConflictError(error)) {
        setSaveStatus('conflict')
        return
      }

      setSaveStatus('error')
    }
  }

  function handleContentChange(nextContent: TipTapDoc) {
    setContent(nextContent)
    setSaveStatus('unsaved')
  }

  function createDraft() {
    if (isDirty) {
      setPendingAction({ type: 'create' })
      return
    }

    navigate('/new-draft')
  }

  async function renameDraft() {
    if (!draft || !titleDirty) {
      return
    }

    const nextTitle = title.trim() || 'Untitled Draft'
    const res = await api.patch<DraftDetail>(`/api/drafts/${draft.id}`, {
      title: nextTitle,
    })

    setDraft(res.data)
    setSaveStatus(contentDirty ? 'unsaved' : 'saved')
    setTitle(res.data.title)
    setUpdatedAt(res.data.updatedAt)
    await loadDrafts()
  }

  function confirmPendingAction() {
    const action = pendingAction
    setPendingAction(null)

    if (!action) {
      return
    }

    if (action.type === 'select') {
      navigate(`/dashboard/${action.draftId}`)
    } else {
      navigate('/new-draft')
    }
  }

  async function generateVariations() {
    if (!activeSentence) return
    setVariations(['Generating...'])
    const results = await makeSentenceVariations(activeSentence.text)
    setVariations(results)
  }

  function useVariation(text: string) {
    if (!activeSentence) {
      return
    }

    const sentences = docToSentenceItems(content)
    const nextSentences = sentences.map((sentence) => (
      sentence.id === activeSentence.id
        ? { ...sentence, text }
        : sentence
    ))

    setActiveSentence({ ...activeSentence, text })
    handleContentChange(sentencesToDoc(nextSentences))
  }

  function updateVariation(index: number, text: string) {
    setVariations((current) => current.map((variation, currentIndex) => (
      currentIndex === index ? text : variation
    )))
  }

  function addOutline(level: number, afterBlockIndex?: number) {
    if (!confirmStructuralEdit()) {
      return
    }

    handleContentChange(addOutlineHeading(content, level, afterBlockIndex))
  }

  function renameOutline(blockIndex: number, nextTitle: string) {
    handleContentChange(renameOutlineHeading(content, blockIndex, nextTitle))
  }

  function moveOutline(fromBlockIndex: number, toBlockIndex: number) {
    if (!confirmStructuralEdit()) {
      return
    }

    handleContentChange(moveOutlineBlock(content, fromBlockIndex, toBlockIndex))
  }

  function deleteOutline(blockIndex: number) {
    if (!confirmStructuralEdit()) {
      return
    }

    handleContentChange(deleteOutlineBlock(content, blockIndex))
  }

  function confirmStructuralEdit() {
    if (workflowStage === 'draft' || countWords(content) === 0) {
      return true
    }

    return window.confirm('This changes your outline structure and linked paragraph order. Continue?')
  }

  async function requestStageChange(nextStage: WorkflowStage) {
    setWorkflowStage(nextStage)

    if (nextStage === 'editing') {
      setMode('editing')
      return
    }

    if (nextStage === 'draft') {
      setMode('production')
      return
    }

    if (nextStage === 'export') {
      setMode('preview')
    }
  }

  async function copyDraftToClipboard() {
    if (!draft) {
      return
    }

    await navigator.clipboard.writeText(`${title}\n\n${docToText(content)}`)
  }

  function exportDraft(format: string) {
    if (!draft || !format) {
      return
    }

    if (format === 'copy') {
      void copyDraftToClipboard()
      return
    }

    const safeTitle = title.trim().replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'flowdraft'

    if (format === 'docx') {
      downloadBlob(`${safeTitle}.docx`, buildDocxBlob(title, content))
    }

    if (format === 'pdf') {
      const element = document.createElement('div')
      element.style.padding = '40px'
      element.style.fontFamily = 'sans-serif'
      element.style.color = '#1a1a1a'
      element.style.maxWidth = '800px'
      element.style.margin = '0 auto'
      element.innerHTML = `
        <h1 style="font-size: 28px; margin-bottom: 24px;">${title}</h1>
        ${docToPreviewBlocks(content).map((block: any) => {
          if (block.type === 'heading') return `<h${block.level + 1} style="margin-top: 24px; font-weight: bold; font-size: ${block.level === 1 ? '24px' : '20px'};">${block.text}</h${block.level + 1}>`
          return `<p style="margin-bottom: 12px; font-size: 16px; line-height: 1.6;">${block.text}</p>`
        }).join('')}
      `
      
      html2pdf().set({
        margin: 10,
        filename: `${safeTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save()
    }
  }

  function closeOnboarding() {
    localStorage.setItem('flowdraft-onboarded', 'true')
    setShowOnboarding(false)
  }

  return (
    <div className={`app-shell${focusMode ? ' is-focus-mode' : ''}`}>
      {/* Sidebar with dynamic full-width behavior */}
      <div className={`sidebar-wrapper ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <Sidebar
          activeSentence={activeSentence}
          collapsed={sidebarCollapsed}
          mode={mode}
          outlineItems={outlineItems}
          variations={variations}
          onAddOutline={addOutline}
          onCollapseChange={setSidebarCollapsed}
          onCreateDraft={createDraft}
          onGenerateVariations={generateVariations}
          onMoveOutline={moveOutline}
          onRenameOutline={renameOutline}
          onDeleteOutline={deleteOutline}
          onUseVariation={useVariation}
          onVariationChange={updateVariation}
        />
      </div>

      <main className="main-workspace">
        <header className="topbar">
          <div className="title-stack">
            {sidebarCollapsed && (
              <button
                className="icon-button sidebar-toggle"
                type="button"
                aria-label="Open sidebar"
                title="Open sidebar"
                onClick={() => setSidebarCollapsed(false)}
              >
                <Menu size={17} />
              </button>
            )}
            <button 
              className="project-back-button" 
              type="button" 
              aria-label="Back to projects" 
              title="Back to projects list" 
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft size={17} />
            </button>
            <input
              className="title-input"
              aria-label="Draft title"
              disabled={!draft}
              value={title}
              onBlur={renameDraft}
              onChange={(event) => {
                setTitle(event.target.value)
                setSaveStatus('unsaved')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
            />
          </div>

          <div className="topbar-actions">
            {(saveStatus === 'conflict' || localStorage.getItem('pref-show-autosave') !== 'false') && (
              <span className={`save-pill status-${saveStatus}`}>
                {saveStatus === 'conflict' ? 'Conflict detected' : saveStatus}
              </span>
            )}

            <button 
              className="icon-button" 
              type="button" 
              aria-label="Version history" 
              title="Version History" 
              disabled={!draft} 
              onClick={() => setShowVersions(!showVersions)}
            >
              <History size={17} />
            </button>

            <div className="export-dropdown-container" style={{ position: 'relative' }}>
              <button
                className="soft-button export-toggle-btn"
                type="button"
                aria-label="Export options"
                title="Export options"
                disabled={!draft}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
              >
                <span>Export</span>
                <ChevronDown size={14} />
              </button>
              {exportMenuOpen && (
                <div className="canva-export-card">
                  <div className="canva-export-header">
                    <h4>Share & Export</h4>
                  </div>
                  <div className="canva-export-body">
                    <button
                      className="canva-export-btn primary-action"
                      type="button"
                      onClick={() => {
                        exportDraft('docx')
                        setExportMenuOpen(false)
                      }}
                    >
                      <Download size={16} /> Download DOCX
                    </button>
                    <button
                      className="canva-export-btn soft-button"
                      type="button"
                      onClick={() => {
                        exportDraft('pdf')
                        setExportMenuOpen(false)
                      }}
                    >
                      <Download size={16} /> Download PDF
                    </button>
                    <button
                      className="canva-export-btn soft-button"
                      type="button"
                      onClick={() => {
                        exportDraft('copy')
                        setExportMenuOpen(false)
                      }}
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-mode-row">
          <div className="segmented-control" role="tablist" aria-label="Editor modes">
            <button
              className={`segmented-tab ${workflowStage === 'draft' ? 'is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={workflowStage === 'draft'}
              onClick={() => void requestStageChange('draft')}
            >
              Write
            </button>
            <button
              className={`segmented-tab ${workflowStage === 'editing' ? 'is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={workflowStage === 'editing'}
              onClick={() => void requestStageChange('editing')}
            >
              Refine
            </button>
            <button
              className={`segmented-tab ${workflowStage === 'export' ? 'is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={workflowStage === 'export'}
              onClick={() => void requestStageChange('export')}
            >
              Preview
            </button>
          </div>
        </div>

        {selectedDraftId ? (
          <EditorPanel
            activeSentenceId={activeSentence?.id ?? null}
            content={content}
            focusMode={focusMode}
            mode={mode}
            onContentChange={handleContentChange}
            onSentenceSelect={setActiveSentence}
            onFocusModeToggle={() => setFocusMode((f) => !f)}
          />
        ) : (
          <section className="workspace-panel empty-state">
            <Download size={26} />
            <h1>Create or select a draft.</h1>
          </section>
        )}

        <div className="workspace-meta">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
        </div>
      </main>

      {pendingAction && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="switch-draft-title">
            <h2 id="switch-draft-title">Unsaved changes</h2>
            <p>Switching now will discard the edits that have not finished saving.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setPendingAction(null)}>Stay</button>
              <button type="button" className="danger-confirm" onClick={confirmPendingAction}>Discard and continue</button>
            </div>
          </section>
        </div>
      )}

      {saveStatus === 'conflict' && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <h2 id="conflict-title">Draft changed elsewhere</h2>
            <p>A newer copy exists in another tab or device. Reload it, or overwrite it with this copy.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => selectedDraftId && void loadDraft(selectedDraftId)}>Reload newer copy</button>
              <button type="button" className="danger-confirm" onClick={() => void saveContent(content, true)}>Overwrite with this copy</button>
            </div>
          </section>
        </div>
      )}

      {showOnboarding && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <h2 id="onboarding-title">Welcome to FlowDraft</h2>
            <p>Draft fast in Production, tighten sentences in Editing, and review the final shape in Preview.</p>
            <div className="modal-actions">
              <button type="button" onClick={closeOnboarding}>Start writing</button>
            </div>
          </section>
        </div>
      )}

      {showVersions && draft && (
        <VersionsPanel
          draftId={draft.id}
          onClose={() => setShowVersions(false)}
          onRestore={(restoredDraft) => {
            const nextContent = normalizeDoc(restoredDraft.content)
            setDraft(restoredDraft)
            setContent(nextContent)
            setSavedContentKey(serializeDoc(nextContent))
            setUpdatedAt(restoredDraft.updatedAt)
            setSaveStatus('saved')
          }}
        />
      )}
    </div>
  )
}

function isConflictError(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 409,
  )
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
