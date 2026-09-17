import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Download, History, Menu } from 'lucide-react'


import EditorPanel from '../components/EditorPanel'
import Sidebar from '../components/Sidebar'
import VersionsPanel from '../components/VersionsPanel'

import { api } from '../lib/api'
import {
  addOutlineHeading,
  countWords,
  docToText,
  deleteOutlineBlock,
  docToHtml,
  extractOutline,
  getParagraphWorkspaces,
  moveOutlineBlock,
  normalizeDoc,
  renameOutlineHeading,
  updateParagraphSentences,
  emptyDoc,
  serializeDoc,
  countCharacters,
  ensureParagraphWorkspaces,
  makeSentenceVariations,
} from '../lib/document'

import type {
  DraftDetail,
  DraftSummary,
  SaveStatus,
  SentenceItem,
  TipTapDoc,
  EditorMode,
  WorkflowStage,
} from '../types'

type PendingAction =
  | { type: 'select'; draftId: string }
  | { type: 'create' }

export default function Dashboard() {
  const { draftId } = useParams<{ draftId: string }>()
  const navigate = useNavigate()

  const [activeSentence, setActiveSentence] = useState<SentenceItem | null>(null)
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null)
  const [content, setContent] = useState<TipTapDoc>(emptyDoc)
  const [draft, setDraft] = useState<DraftDetail | null>(null)
  const [mode, setMode] = useState<EditorMode>('production')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [savedContentKey, setSavedContentKey] = useState(serializeDoc(emptyDoc))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [title, setTitle] = useState('Untitled Draft')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('draft')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('flowdraft-onboarded') !== 'true')
  const [focusMode, setFocusMode] = useState(false)
  const [sentenceVariations, setSentenceVariations] = useState<
    Record<string, string[]>
  >({})

  const selectedDraftId = draft?.id ?? null
  const contentKey = serializeDoc(content)
  const contentDirty = Boolean(selectedDraftId) && contentKey !== savedContentKey
  const titleDirty = draft !== null && title.trim() !== draft.title
  const isDirty = contentDirty || titleDirty
  const wordCount = countWords(content)
  const characterCount = countCharacters(content)
  const outlineItems = extractOutline(content)
  const variations =
  activeSentence
    ? sentenceVariations[activeSentence.id] ?? []
    : []

  // Stable refs for debounced saves
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
      setActiveSentence(null)
      setActiveParagraphId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  useEffect(() => {
    if (!selectedDraftId || !contentDirty || saveStatus === 'saving' || saveStatus === 'conflict') return
    const timeoutId = window.setTimeout(() => {
      void saveContentRef.current(content, false)
    }, 1200)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, contentDirty, saveStatus, selectedDraftId, updatedAt])

  useEffect(() => {
    if (!selectedDraftId || !titleDirty || saveStatus === 'conflict') return
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
    setActiveParagraphId(null)
    setContent(nextContent)
    setDraft(res.data)
    setSavedContentKey(serializeDoc(nextContent))
    setSaveStatus('saved')
    setTitle(res.data.title)
    setUpdatedAt(res.data.updatedAt)
    setSentenceVariations({})
    setShowVersions(false)
  }

  async function saveContent(nextContent: TipTapDoc, overwriteConflict: boolean) {
    if (!selectedDraftId) return
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
      setDraft(res.data.draft)
      setSavedContentKey(
        serializeDoc(savedDoc),
      )
      setDraft(res.data.draft)
      setSavedContentKey(serializeDoc(savedDoc))
      setSaveStatus('saved')
      setUpdatedAt(res.data.draft.updatedAt)
      await loadDrafts()
    } catch (error) {
      if (isConflictError(error)) {
        setSaveStatus('conflict')
      } else {
        setSaveStatus('error')
      }
    }
  }

  function handleContentChange(nextContent: TipTapDoc) {
    setContent(nextContent)
    setSaveStatus('unsaved')
    // Clear active sentence if it might have been removed
    if (activeSentence) {
      const paragraphs = getParagraphWorkspaces(nextContent)
      const stillExists = paragraphs.some(p => p.sentences.some(s => s.id === activeSentence.id))
      if (!stillExists) {
        setActiveSentence(null)
        setActiveParagraphId(null)
      }
    }
  }

  function handleSentenceSelect(
    sentence: SentenceItem | null,
  ) {
    setActiveSentence(sentence)

    if (!sentence) {
      setActiveParagraphId(null)
      return
    }

    const workspace =
      getParagraphWorkspaces(content)
        .find(p =>
          p.sentences.some(
            s => s.id === sentence.id,
          ),
        )

    setActiveParagraphId(
      workspace?.id ?? null,
    )
  }


  function createDraft() {
    if (isDirty) {
      setPendingAction({ type: 'create' })
      return
    }
    navigate('/new-draft')
  }

  async function renameDraft() {
    if (!draft || !titleDirty) return
    const nextTitle = title.trim() || 'Untitled Draft'
    const res = await api.patch<DraftDetail>(`/api/drafts/${draft.id}`, { title: nextTitle })
    setDraft(res.data)
    setSaveStatus(contentDirty ? 'unsaved' : 'saved')
    setTitle(res.data.title)
    setUpdatedAt(res.data.updatedAt)
    await loadDrafts()
  }

  function confirmPendingAction() {
    const action = pendingAction
    setPendingAction(null)
    if (!action) return
    if (action.type === 'select') {
      navigate(`/dashboard/${action.draftId}`)
    } else {
      navigate('/new-draft')
    }
  }

  async function generateSingleVariation() {
    if (!activeSentence) return

    try {
      const variation = await makeSentenceVariations(
        activeSentence.text
      )

      setSentenceVariations(current => ({
        ...current,
        [activeSentence.id]: [
          ...(current[activeSentence.id] ?? []),
          variation,
        ],
      }))
    } catch (error) {
      console.error('Failed to generate variation', error)
    }
  }

  function addVariation() {
    if (!activeSentence) return

    setSentenceVariations(current => ({
      ...current,
      [activeSentence.id]: [
        ...(current[activeSentence.id] ?? []),
        '',
      ],
    }))
  }

  function deleteVariation(index: number) {
    if (!activeSentence) return

    setSentenceVariations(current => ({
      ...current,
      [activeSentence.id]:
        (current[activeSentence.id] ?? []).filter(
          (_, i) => i !== index
        ),
    }))
  }
  
  function replaceCurrentSentence(
    newText: string,
  ) {
    if (!activeSentence) {
      return
    }

    const paragraphs =
      getParagraphWorkspaces(content)

    const workspace =
      paragraphs.find(p =>
        p.sentences.some(
          s =>
            s.id === activeSentence.id,
        ),
      )

    if (!workspace) {
      return
    }

    const updatedSentences =
      workspace.sentences.map(
        sentence =>
          sentence.id ===
          activeSentence.id
            ? {
                ...sentence,
                text: newText,
              }
            : sentence,
      )

    const newDoc =
      updateParagraphSentences(
        content,
        workspace.headingId,
        updatedSentences,
      )

    handleContentChange(newDoc)

    setActiveSentence({
      ...activeSentence,
      text: newText,
    })
  }

  // function useVariation(paragraphId: string, sentenceId: string, newText: string) {
  //   const paragraphs = getParagraphWorkspaces(content)
  //   const targetParagraph = paragraphs.find(p => p.id === paragraphId)
  //   if (!targetParagraph) return

  //   const updatedSentences = targetParagraph.sentences.map(s =>
  //     s.id === sentenceId ? { ...s, text: newText } : s
  //   )

  //   const newDoc = updateParagraphSentences(content, targetParagraph.headingId, updatedSentences)
  //   handleContentChange(newDoc)
  //   // Update active sentence reference
  //   if (activeSentence && activeSentence.id === sentenceId) {
  //     setActiveSentence({ ...activeSentence, text: newText })
  //   }
  // }

  function updateVariation(index: number, text: string) {
    if (!activeSentence) return

    setSentenceVariations(current => ({
      ...current,
      [activeSentence.id]:
        (current[activeSentence.id] ?? []).map(
          (v, i) => (i === index ? text : v)
        ),
    }))
  }

  function addOutline(level: number, afterBlockIndex?: number) {
    if (!confirmStructuralEdit()) return
    handleContentChange(addOutlineHeading(content, level, afterBlockIndex))
  }

  function renameOutline(blockIndex: number, nextTitle: string) {
    handleContentChange(renameOutlineHeading(content, blockIndex, nextTitle))
  }

  function moveOutline(fromBlockIndex: number, toBlockIndex: number) {
    if (!confirmStructuralEdit()) return
    handleContentChange(moveOutlineBlock(content, fromBlockIndex, toBlockIndex))
  }

  function deleteOutline(blockIndex: number) {
    if (!confirmStructuralEdit()) return
    handleContentChange(deleteOutlineBlock(content, blockIndex))
  }

  function confirmStructuralEdit() {
    if (workflowStage === 'draft' || countWords(content) === 0) return true
    return window.confirm('This changes your outline structure and linked paragraph order. Continue?')
  }

  async function requestStageChange(nextStage: WorkflowStage) {
    setWorkflowStage(nextStage)
    if (nextStage === 'editing') setMode('editing')
    else if (nextStage === 'draft') setMode('production')
    else if (nextStage === 'export') setMode('preview')
  }

  async function copyDraftToClipboard() {
    if (!draft) return
    await navigator.clipboard.writeText(`${title}\n\n${docToText(content)}`)
  }

  async function exportDraft(format: string) {
  if (!draft) return

  if (format === 'copy') {
    void copyDraftToClipboard()
    return
  }

  const safeTitle =
    title
      .trim()
      .replace(/[^\w-]+/g, '-')
      .replace(/^-|-$/g, '') || 'flowdraft'

  // =========================
  // DOCX (lazy loaded)
  // =========================
  if (format === 'docx') {
    const { buildDocxBlob } = await import('../lib/document')

    const blob = await buildDocxBlob(title, content)

    downloadBlob(`${safeTitle}.docx`, blob)
    return
  }

  // =========================
  // PDF (lazy loaded)
  // =========================
  if (format === 'pdf') {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default

    const element = document.createElement('div')

    element.style.padding = '40px'
    element.style.fontFamily = 'sans-serif'
    element.style.color = '#1a1a1a'
    element.style.maxWidth = '800px'
    element.style.margin = '0 auto'

    element.innerHTML = `
      <h1 style="font-size:28px;margin-bottom:24px;">
        ${title}
      </h1>

      ${docToHtml(content)}
    `

    html2pdf()
      .set({
        margin: 10,
        filename: `${safeTitle}.pdf`,
        image: {
          type: 'jpeg',
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(element)
      .save()

    return
  }
}

  function closeOnboarding() {
    localStorage.setItem('flowdraft-onboarded', 'true')
    setShowOnboarding(false)
  }

  return (
    <div className={`app-shell${focusMode ? ' is-focus-mode' : ''}`}>
      <div className={`sidebar-wrapper ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <Sidebar
          activeSentence={activeSentence}
          activeParagraphId={activeParagraphId}
          collapsed={sidebarCollapsed}
          mode={mode}
          outlineItems={outlineItems}
          variations={variations}
          sidebarWidth={sidebarWidth}
          onSidebarWidthChange={setSidebarWidth}
          onAddOutline={addOutline}
          onCollapseChange={setSidebarCollapsed}
          onCreateDraft={createDraft}
          onMoveOutline={moveOutline}
          onRenameOutline={renameOutline}
          onDeleteOutline={deleteOutline}
          onUseVariation={replaceCurrentSentence}
          onVariationChange={updateVariation}
          onAddVariation={addVariation}
          onDeleteVariation={deleteVariation}
          onGenerateSingleVariation={generateSingleVariation}
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
                if (event.key === 'Enter') event.currentTarget.blur()
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
            onSentenceSelect={handleSentenceSelect}
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
            setActiveSentence(null)
            setActiveParagraphId(null)
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