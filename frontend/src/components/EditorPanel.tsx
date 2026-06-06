import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import {
  deleteOutlineBlock,
  docToPreviewBlocks,
  getParagraphWorkspaces,
  moveOutlineBlock,
  updateParagraphSentences,
} from '../lib/document'
import type { EditorMode, SentenceItem, TipTapDoc } from '../types'
import RichTextEditorPanel from './RichTextEditorPanel'

interface EditorPanelProps {
  activeSentenceId: string | null
  content: TipTapDoc
  focusMode: boolean
  mode: EditorMode
  onContentChange: (content: TipTapDoc) => void
  onSentenceSelect: (sentence: SentenceItem) => void
  onFocusModeToggle: () => void
}

export default function EditorPanel({
  activeSentenceId,
  content,
  focusMode,
  mode,
  onContentChange,
  onSentenceSelect,
  onFocusModeToggle,
}: EditorPanelProps) {
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
    return (
      <PreviewPane
        content={content}
      />
    )
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


function SentenceEditor({
  activeSentenceId,
  content,
  onContentChange,
  onSentenceSelect,
}: {
  activeSentenceId: string | null
  content: TipTapDoc
  onContentChange: (content: TipTapDoc) => void
  onSentenceSelect: (sentence: SentenceItem) => void
}) {
  const paragraphs = getParagraphWorkspaces(content)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    if (!overId || activeId === overId) {
      return
    }

    const paragraphIndex = Number(activeId.split(':')[0])
    const paragraph = paragraphs.find((item) => item.paragraphIndex === paragraphIndex)

    if (!paragraph) {
      return
    }

    const sentences = textToSentenceItems(paragraph.text, paragraph.paragraphIndex)
    const oldIndex = sentences.findIndex((sentence) => sentence.id === activeId)
    const newIndex = sentences.findIndex((sentence) => sentence.id === overId)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    onContentChange(updateParagraphSentences(content, paragraph.headingIndex, arrayMove(sentences, oldIndex, newIndex)))
  }

  function updateSentence(headingIndex: number, sentenceId: string, text: string) {
    const paragraph = paragraphs.find((item) => item.headingIndex === headingIndex)
    if (!paragraph) {
      return
    }

    const nextSentences = textToSentenceItems(paragraph.text, paragraph.headingIndex).map((sentence) => (
      sentence.id === sentenceId
        ? { ...sentence, text }
        : sentence
    ))

    onContentChange(updateParagraphSentences(content, headingIndex, nextSentences))
  }

  function deleteSentence(headingIndex: number, sentenceId: string) {
    const paragraph = paragraphs.find((item) => item.headingIndex === headingIndex)
    if (!paragraph) {
      return
    }

    const nextSentences = textToSentenceItems(paragraph.text, paragraph.headingIndex).filter((sentence) => sentence.id !== sentenceId)
    onContentChange(updateParagraphSentences(content, headingIndex, nextSentences))
  }

  function moveParagraph(fromHeadingIndex: number, toHeadingIndex: number) {
    onContentChange(moveOutlineBlock(content, fromHeadingIndex, toHeadingIndex))
  }

  function deleteParagraph(headingIndex: number) {
    if (window.confirm('Delete this outline point and its paragraph?')) {
      onContentChange(deleteOutlineBlock(content, headingIndex))
    }
  }

  if (paragraphs.length === 0) {
    return (
      <section className="workspace-panel sentence-empty">
        Add a few sentences in Production mode, then return here to refine them.
      </section>
    )
  }

  return (
    <section className="workspace-panel sentence-stage">
      {paragraphs.map((paragraph, paragraphOrder) => {
        const sentences = textToSentenceItems(paragraph.text, paragraph.headingIndex)
        const previousParagraph = paragraphs[paragraphOrder - 1]
        const nextParagraph = paragraphs[paragraphOrder + 1]

        return (
          <article key={paragraph.id} className="sentence-paragraph-group">
            <header className="sentence-paragraph-header">
              <div>
                <span className="paragraph-index">{paragraph.level === 1 ? 'Chapter' : 'Subchapter'}</span>
                <h3>{paragraph.title}</h3>
              </div>
              <div className="cluster">
                <button className="soft-button compact-button" type="button" disabled={!previousParagraph} onClick={() => previousParagraph && moveParagraph(paragraph.headingIndex, previousParagraph.headingIndex)}>
                  Up
                </button>
                <button className="soft-button compact-button" type="button" disabled={!nextParagraph} onClick={() => nextParagraph && moveParagraph(paragraph.headingIndex, nextParagraph.headingIndex)}>
                  Down
                </button>
                <button className="icon-button danger-button" type="button" aria-label="Delete paragraph" onClick={() => deleteParagraph(paragraph.headingIndex)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </header>
            {sentences.length === 0 ? (
              <p className="muted-copy inline-muted">No sentences in this paragraph yet.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sentences.map((sentence) => sentence.id)} strategy={verticalListSortingStrategy}>
                  {sentences.map((sentence, index) => (
                    <SortableSentence
                      key={sentence.id}
                      active={sentence.id === activeSentenceId}
                      index={index}
                      headingIndex={paragraph.headingIndex}
                      sentence={sentence}
                      onChange={updateSentence}
                      onDelete={deleteSentence}
                      onSelect={onSentenceSelect}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </article>
        )
      })}
    </section>
  )
}

function SortableSentence({
  active,
  index,
  headingIndex,
  sentence,
  onChange,
  onDelete,
  onSelect,
}: {
  active: boolean
  index: number
  headingIndex: number
  sentence: SentenceItem
  onChange: (headingIndex: number, sentenceId: string, text: string) => void
  onDelete: (headingIndex: number, sentenceId: string) => void
  onSelect: (sentence: SentenceItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sentence.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const toneIndex = sentence.text.startsWith('\n') ? 0 : (sentence.text.length % 5)

  return (
    <article
      ref={setNodeRef}
      className={`sentence-block sentence-tone-${toneIndex} ${active ? 'is-active' : ''}`}
      style={style}
      onClick={() => onSelect(sentence)}
    >
      <button className="icon-button drag-handle" type="button" aria-label="Move sentence" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <textarea
        aria-label={`Sentence ${index + 1}`}
        rows={Math.max(2, Math.ceil(sentence.text.length / 80))}
        value={sentence.text}
        onChange={(event) => onChange(headingIndex, sentence.id, event.target.value)}
        onFocus={() => onSelect(sentence)}
      />
      <button className="icon-button danger-button" type="button" aria-label="Delete sentence" onClick={() => onDelete(headingIndex, sentence.id)}>
        <Trash2 size={15} />
      </button>
    </article>
  )
}

function PreviewPane({
  content,
}: {
  content: TipTapDoc
}) {
  const blocks = docToPreviewBlocks(content)

  return (
    <section className="workspace-panel preview-pane">
      {blocks.length === 0 && (
        <p className="preview-empty">Nothing to preview yet.</p>
      )}
      {blocks.map((block) => {
        if (block.type === 'heading') {
          const HeadingTag = block.level === 1 ? 'h1' : 'h2'

          return (
            <HeadingTag key={block.id}>
              {block.text}
            </HeadingTag>
          )
        }

        return (
          <p key={block.id}>
            {block.text}
          </p>
        )
      })}
    </section>
  )
}

function textToSentenceItems(text: string, headingIndex: number): SentenceItem[] {
  const tokens: string[] = []
  const parts = text.split(/(\n\n+)/)
  for (const part of parts) {
    if (part.match(/^\n\n+$/)) {
      tokens.push(part)
    } else {
      const sentences = part.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      if (sentences) {
        for (const s of sentences) {
          if (s.trim()) tokens.push(s.trim())
        }
      }
    }
  }
  return tokens.map((sentence, index) => ({
    id: `${headingIndex}:sentence-${index}`,
    text: sentence,
  }))
}

