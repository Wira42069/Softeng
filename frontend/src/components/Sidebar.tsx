import { useEffect, useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronLeft, FilePlus2, GripVertical, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { EditorMode, OutlineItem, SentenceItem } from '../types'

interface SidebarProps {
  activeSentence: SentenceItem | null
  collapsed: boolean
  mode: EditorMode
  outlineItems: OutlineItem[]
  variations: string[]
  onAddOutline: (level: number, afterBlockIndex?: number) => void
  onDeleteOutline: (blockIndex: number) => void
  onCollapseChange: (collapsed: boolean) => void
  onCreateDraft: () => void
  onGenerateVariations: () => void
  onMoveOutline: (fromBlockIndex: number, toBlockIndex: number) => void
  onRenameOutline: (blockIndex: number, title: string) => void
  onUseVariation: (text: string) => void
  onVariationChange: (index: number, text: string) => void
}

export default function Sidebar({
  activeSentence,
  collapsed,
  mode,
  outlineItems,
  variations,
  onAddOutline,
  onDeleteOutline,
  onCollapseChange,
  onCreateDraft,
  onGenerateVariations,
  onMoveOutline,
  onRenameOutline,
  onUseVariation,
  onVariationChange,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <header className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-logo">📝</span>
          {!collapsed && <span>FlowDraft</span>}
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          onClick={() => onCollapseChange(true)}
        >
          <ChevronLeft size={16} />
        </button>
      </header>

      {/* hide body sections when collapsed to allow smooth width transition */}
      {!collapsed && (
        mode === 'editing' ? (
          <EditingAssistant
            activeSentence={activeSentence}
            variations={variations}
            onGenerateVariations={onGenerateVariations}
            onUseVariation={onUseVariation}
            onVariationChange={onVariationChange}
          />
        ) : (
          <>
            <section className="sidebar-section sidebar-project-action">
              <button className="primary-action" type="button" onClick={onCreateDraft}>
                <FilePlus2 size={16} />
                New Draft
              </button>
            </section>
            <OutlineManager
              outlineItems={outlineItems}
              onAddOutline={onAddOutline}
              onMoveOutline={onMoveOutline}
              onRenameOutline={onRenameOutline}
              onDeleteOutline={onDeleteOutline}
            />
          </>
        )
      )}
    </aside>
  )
}

function OutlineManager({
  outlineItems,
  onAddOutline,
  onMoveOutline,
  onRenameOutline,
  onDeleteOutline,
}: {
  outlineItems: OutlineItem[]
  onAddOutline: (level: number, afterBlockIndex?: number) => void
  onMoveOutline: (fromBlockIndex: number, toBlockIndex: number) => void
  onRenameOutline: (blockIndex: number, title: string) => void
  onDeleteOutline: (blockIndex: number) => void
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(outlineItems[0]?.id ?? null)
  const activeOutlineItem = outlineItems.find((item) => item.id === activeOutlineId)

  useEffect(() => {
    if (!outlineItems.some((item) => item.id === activeOutlineId)) {
      setActiveOutlineId(outlineItems[0]?.id ?? null)
    }
  }, [activeOutlineId, outlineItems])
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

    const activeItem = outlineItems.find((item) => item.id === activeId)
    const overItem = outlineItems.find((item) => item.id === overId)

    if (!activeItem || !overItem) {
      return
    }

    onMoveOutline(activeItem.blockIndex, overItem.blockIndex)
  }

  return (
    <section className="sidebar-section outline-section">
      <div className="section-title-row">
        <h3>Chapters</h3>
        <div className="outline-add-menu">
          <button
            className="outline-add-button"
            type="button"
            aria-expanded={addMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAddMenuOpen((isOpen) => !isOpen)}
          >
            <Plus size={15} />
            Add
            <ChevronDown size={14} />
          </button>
          {addMenuOpen && (
            <div className="outline-add-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAddOutline(1, activeOutlineItem?.blockIndex)
                  setAddMenuOpen(false)
                }}
              >
                Chapter
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAddOutline(2, activeOutlineItem?.blockIndex)
                  setAddMenuOpen(false)
                }}
              >
                Subchapter
              </button>
            </div>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={outlineItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="outline-list">
            {outlineItems.map((item) => (
              <SortableOutlineItem
                key={item.id}
                item={item}
                active={item.id === activeOutlineId}
                onSelect={() => setActiveOutlineId(item.id)}
                onRenameOutline={onRenameOutline}
                onDeleteOutline={onDeleteOutline}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  )
}

function SortableOutlineItem({
  item,
  active,
  onSelect,
  onRenameOutline,
  onDeleteOutline,
}: {
  item: OutlineItem
  active: boolean
  onSelect: () => void
  onRenameOutline: (blockIndex: number, title: string) => void
  onDeleteOutline: (blockIndex: number) => void
}) {
  const disabled = item.blockIndex < 0
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      className={`outline-item level-${item.level} ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
      style={style}
      onClick={onSelect}
    >
      <button className="icon-button drag-handle" type="button" aria-label="Move outline item" disabled={disabled} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </button>
      <textarea
        aria-label="Section name"
        disabled={disabled}
        rows={1}
        value={item.title}
        placeholder="Untitled Section"
        onFocus={onSelect}
        onChange={(event) => {
          onRenameOutline(item.blockIndex, event.target.value)
          event.target.style.height = 'auto'
          event.target.style.height = `${event.target.scrollHeight}px`
        }}
        ref={(el) => {
          if (el) {
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }
        }}
      />
      {!disabled && (
        <button 
          className="icon-button danger-button delete-outline-button" 
          type="button" 
          aria-label="Delete outline item" 
          onClick={() => onDeleteOutline(item.blockIndex)}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function EditingAssistant({
  activeSentence,
  variations,
  onGenerateVariations,
  onUseVariation,
  onVariationChange,
}: {
  activeSentence: SentenceItem | null
  variations: string[]
  onGenerateVariations: () => void
  onUseVariation: (text: string) => void
  onVariationChange: (index: number, text: string) => void
}) {
  return (
    <section className="sidebar-section assistant-section">
      <h3>Selected Sentence</h3>
      <div className="selected-sentence">
        {activeSentence?.text || 'Select a highlighted sentence in the editor.'}
      </div>

      <button className="primary-action" type="button" disabled={!activeSentence} onClick={onGenerateVariations}>
        <Sparkles size={16} />
        Generate Variations
      </button>

      <div className="variation-list">
        {variations.map((variation, index) => (
          <article key={`${index}-${variation.slice(0, 12)}`} className="variation-card">
            <textarea
              aria-label={`Variation ${index + 1}`}
              rows={4}
              value={variation}
              onChange={(event) => onVariationChange(index, event.target.value)}
            />
            <button type="button" onClick={() => onUseVariation(variation)}>
              Replace Sentence
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
