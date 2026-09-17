export type EditorMode = 'production' | 'editing' | 'preview'

export type WorkflowStage =
  | 'topic'
  | 'outline'
  | 'draft'
  | 'editing'
  | 'reflection'
  | 'export'

export type SaveStatus =
  | 'saved'
  | 'saving'
  | 'unsaved'
  | 'conflict'
  | 'error'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface TipTapNode {
  type: string
  attrs?: Record<string, unknown> & {
    sentenceItems?: SentenceItem[]  
  }
  content?: TipTapNode[]
  marks?: { type: string; attrs?: Record<string, JsonValue> }[]
  text?: string
}

export interface TipTapDoc {
  type: 'doc'
  content: TipTapNode[]
}

export interface DraftSummary {
  id: string
  title: string
  topic?: string | null
  deadline?: string | null
  starred: boolean
  createdAt: string
  updatedAt: string
  wordCount: number
}

export interface DraftDetail extends DraftSummary {
  content: TipTapDoc | null
}

export interface VersionSummary {
  id: string
  createdAt: string
}

/* ---------------------------- */
/* FIXED: SentenceItem (single definition only)
/* ---------------------------- */
export interface SentenceVariation {
  id: string
  text: string
}

export interface SentenceItem {
  id: string
  text: string

  variations?: SentenceVariation[]

  paragraphIndex: number
  sentenceIndex: number
}

export interface OutlineItem {
  id: string
  title: string
  level: number
  blockIndex: number
}

/* ---------------------------- */
/* FIXED: consistent workspace model
/* ---------------------------- */
export interface ParagraphWorkspaceItem {
  id: string
  headingId: string
  title: string
  level: number
  text: string
  sentences: SentenceItem[]
  wordCount: number
  lengthStatus: 'too-short' | 'optimal' | 'too-long'
}

export interface PreviewBlock {
  id: string
  type: 'heading' | 'paragraph' | 'list'
  level: number
  text: string
}