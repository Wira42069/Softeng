export type EditorMode = 'production' | 'editing' | 'preview'

export type WorkflowStage = 'topic' | 'outline' | 'draft' | 'editing' | 'reflection' | 'export'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface TipTapNode {
  type: string
  attrs?: Record<string, JsonValue>
  content?: TipTapNode[]
  marks?: {
    type: string
    attrs?: Record<string, JsonValue>
  }[]
  text?: string
}

export interface TipTapDoc {
  type: 'doc'
  content: TipTapNode[]
}

export interface DraftSummary {
  id: string
  title: string
  updatedAt: string
  createdAt: string
  topic?: string | null
  deadline?: string | null
  starred: boolean
}

export interface DraftDetail extends DraftSummary {
  content: TipTapDoc | null
}

export interface VersionSummary {
  id: string
  createdAt: string
}

export interface SentenceItem {
  id: string
  text: string
}

export interface OutlineItem {
  id: string
  title: string
  level: number
  blockIndex: number
}

export interface ParagraphWorkspaceItem {
  id: string
  title: string
  level: number
  headingIndex: number
  paragraphIndex: number
  text: string
  wordCount: number
  lengthStatus: 'too-short' | 'optimal' | 'too-long'
}

export interface PreviewBlock {
  id: string
  type: 'heading' | 'paragraph' | 'list'
  level: number
  text: string
}
