import { useEffect, useRef } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import {
  docToPreviewBlocks,
  getParagraphWorkspaces,
  updateParagraphSentences,
  removeParagraphByHeading
} from '../lib/document'
import type { EditorMode, SentenceItem, TipTapDoc } from '../types'
import RichTextEditorPanel from './RichTextEditorPanel'

interface EditorPanelProps {
  activeSentenceId: string | null
  content: TipTapDoc
  focusMode: boolean
  mode: EditorMode
  onContentChange: (content: TipTapDoc) => void
  onSentenceSelect: (sentence: SentenceItem | null) => void
  onFocusModeToggle: () => void
}

export default function EditorPanel(props: EditorPanelProps) {
  const {
    activeSentenceId,
    content,
    focusMode,
    mode,
    onContentChange,
    onSentenceSelect,
    onFocusModeToggle,
  } = props

  if (mode === 'editing') {
    return (
      <SentenceEditor
        activeSentenceId={activeSentenceId}
        content={content}
        onContentChange={onContentChange}
        onSentenceSelect={onSentenceSelect}
      />
    )
  }

  if (mode === 'preview') {
    return <PreviewPane content={content} />
  }

  return (
    <RichTextEditorPanel
      content={content}
      focusMode={focusMode}
      onContentChange={onContentChange}
      onFocusModeToggle={onFocusModeToggle}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Sentence Editor                                                   */
/* ------------------------------------------------------------------ */

function SentenceEditor({
  activeSentenceId,
  content,
  onContentChange,
  onSentenceSelect,
}: {
  activeSentenceId: string | null
  content: TipTapDoc
  onContentChange: (content: TipTapDoc) => void
  onSentenceSelect: (sentence: SentenceItem | null) => void
}) {
  const paragraphs = getParagraphWorkspaces(content)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function updateParagraph(headingId: string, sentences: SentenceItem[]) {
    onContentChange(updateParagraphSentences(content, headingId, sentences))
  }

  function handleDragEnd(
    event: DragEndEvent,
    headingId: string,
    sentences: SentenceItem[],
  ) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId || activeId === overId) return
    const oldIndex = sentences.findIndex(s => s.id === activeId)
    const newIndex = sentences.findIndex(s => s.id === overId)
    if (oldIndex === -1 || newIndex === -1) return
    updateParagraph(headingId, arrayMove(sentences, oldIndex, newIndex))
  }

  function updateSentence(
    headingId: string,
    sentenceId: string,
    text: string,
    sentences: SentenceItem[],
  ) {
    updateParagraph(
      headingId,
      sentences.map(s => (s.id === sentenceId ? { ...s, text } : s)),
    )
  }

  function deleteSentence(headingId: string, sentenceId: string, sentences: SentenceItem[]) {
    const newSentences = sentences.filter(s => s.id !== sentenceId)
    if (newSentences.length === 0) {
      onContentChange(removeParagraphByHeading(content, headingId))
    } else {
      updateParagraph(headingId, newSentences)
    }
    if (activeSentenceId === sentenceId) onSentenceSelect(null)
  }

  if (!paragraphs.length) {
    return (
      <section className="workspace-panel sentence-empty">
        Add a few sentences in Production mode, then return here to refine them.
      </section>
    )
  }
  useEffect(() => {
    console.log('SentenceEditor content changed:', content)
  }, [content])

  return (
    <section className="workspace-panel sentence-stage">
      {paragraphs.map(p => (
        <article key={p.id} className="sentence-paragraph-group">
          <header className="sentence-paragraph-header">
            <span className="paragraph-index">
              {p.level === 1 ? 'Chapter' : 'Subchapter'}
            </span>
            <h3>{p.title}</h3>
          </header>

          {!p.sentences.length ? (
            <p className="muted-copy inline-muted">
              No sentences in this paragraph yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, p.headingId, p.sentences)}
            >
              <SortableContext
                items={p.sentences.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {p.sentences.map(s => (
                  <SortableSentence
                    key={s.id}
                    sentence={s}
                    active={s.id === activeSentenceId}
                    onChange={(text) =>
                      updateSentence(p.headingId, s.id, text, p.sentences)
                    }
                    onDelete={() =>
                      deleteSentence(p.headingId, s.id, p.sentences)
                    }
                    onSelect={onSentenceSelect}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </article>
      ))}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Sortable Sentence – fixed sizing                                  */
/* ------------------------------------------------------------------ */

function SortableSentence({
  sentence,
  active,
  onChange,
  onDelete,
  onSelect,
}: {
  sentence: SentenceItem
  active: boolean
  onChange: (text: string) => void
  onDelete: () => void
  onSelect: (s: SentenceItem | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sentence.id })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [sentence.text])

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`sentence-block ${active ? 'is-active' : ''}`}
      onClick={() => onSelect(sentence)}
    >
      <button
        {...attributes}
        {...listeners}
        className="icon-button drag-handle"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      <textarea
        ref={textareaRef}
        value={sentence.text}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        rows={1}
        className="sentence-textarea"
      />

      <button
        className="icon-button danger-button"
        onClick={onDelete}
        aria-label="Delete sentence"
      >
        <Trash2 size={15} />
      </button>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Preview                                                           */
/* ------------------------------------------------------------------ */

function PreviewPane({ content }: { content: TipTapDoc }) {
  const blocks = docToPreviewBlocks(content)
  return (
    <section className="workspace-panel preview-pane">
      {!blocks.length && (
        <p className="preview-empty">Nothing to preview yet.</p>
      )}
      {blocks.map(b =>
        b.type === 'heading' ? (
          b.level === 1 ? (
            <h1 key={b.id}>{b.text}</h1>
          ) : (
            <h2 key={b.id}>{b.text}</h2>
          )
        ) : (
          <p key={b.id}>{b.text}</p>
        ),
      )}
    </section>
  )
}