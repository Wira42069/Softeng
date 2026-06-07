import type {
  OutlineItem,
  ParagraphWorkspaceItem,
  PreviewBlock,
  SentenceItem,
  TipTapDoc,
  TipTapNode,
} from '../types'

import { splitToSentences } from './sentences'

export const emptyDoc: TipTapDoc = {
  type: 'doc',
  content: [],
}

/* ---------------------------- */
/* NORMALIZATION                */
/* ---------------------------- */

export function normalizeDoc(value: unknown): TipTapDoc {
  if (
    value &&
    typeof value === 'object' &&
    (value as TipTapDoc).type === 'doc' &&
    Array.isArray((value as TipTapDoc).content)
  ) {
    return sanitizeDoc(value as TipTapDoc)
  }
  return emptyDoc
}

export function ensureParagraphWorkspaces(doc: TipTapDoc): TipTapDoc {
  const newContent: TipTapNode[] = []
  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i]
    newContent.push(node)
    if (node.type === 'heading') {
      const nextNode = doc.content[i + 1]
      if (!nextNode || nextNode.type !== 'paragraph') {
        newContent.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] })
      }
    }
  }
  return { type: 'doc', content: newContent }
}

/* ---------------------------- */
/* TEXT UTILITIES              */
/* ---------------------------- */

export function docToText(doc: TipTapDoc): string {
  return collectText(doc.content).replace(/\s+/g, ' ').trim()
}

export function countWords(doc: TipTapDoc): number {
  const text = docToText(doc)
  return text ? text.split(/\s+/).length : 0
}

export function countCharacters(doc: TipTapDoc): number {
  return docToText(doc).length
}

export function serializeDoc(doc: TipTapDoc): string {
  return JSON.stringify(doc)
}

/* ---------------------------- */
/* SENTENCE UTILITIES          */
/* ---------------------------- */

export function docToSentenceItems(doc: TipTapDoc): SentenceItem[] {
  const sentences: SentenceItem[] = []
  let idCounter = 0
  for (const node of doc.content) {
    if (node.type === 'paragraph') {
      const text = collectText(node.content)
      const rawSentences = splitToSentences(text, 'doc')
      for (const s of rawSentences) {
        sentences.push({ id: `sent-${idCounter++}`, text: s.text })
      }
    }
  }
  return sentences
}

export function sentencesToDoc(sentences: SentenceItem[]): TipTapDoc {
  const paragraphs: TipTapNode[] = []
  let currentPara = ''
  for (const sent of sentences) {
    currentPara += sent.text + ' '
    if (currentPara.length > 300 || sent.text.endsWith('.') || sent.text.endsWith('?') || sent.text.endsWith('!')) {
      paragraphs.push({
        type: 'paragraph',
        content: [{ type: 'text', text: currentPara.trim() }]
      })
      currentPara = ''
    }
  }
  if (currentPara.trim()) {
    paragraphs.push({
      type: 'paragraph',
      content: [{ type: 'text', text: currentPara.trim() }]
    })
  }
  return { type: 'doc', content: paragraphs }
}

export async function makeSentenceVariations(
  sentence: string,
): Promise<string> {
  const response = await fetch('http://localhost:3000/api/rewrite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sentence,
    }),
  })

  const data = await response.json()

  return data.variation
}

/* ---------------------------- */
/* OUTLINE MANIPULATION        */
/* ---------------------------- */

export function extractOutline(doc: TipTapDoc): OutlineItem[] {
  const items = doc.content.flatMap((node, i) => {
    if (node.type !== 'heading') return []
    const id = String(node.attrs?.id ?? `heading-${i}`)
    const level = Number(node.attrs?.level ?? 1) || 1
    return {
      id,
      title: collectText(node.content) || 'Untitled',
      level,
      blockIndex: i,
    }
  })
  return items.length ? items : [{ id: 'empty', title: 'Draft', level: 1, blockIndex: -1 }]
}

export function addOutlineHeading(doc: TipTapDoc, level: number, afterBlockIndex?: number): TipTapDoc {
  const newHeading: TipTapNode = {
    type: 'heading',
    attrs: { level, id: `heading-${Date.now()}` },
    content: [{ type: 'text', text: 'New Heading' }]
  }
  const insertIndex = afterBlockIndex !== undefined ? afterBlockIndex + 1 : doc.content.length
  const newContent = [...doc.content]
  newContent.splice(insertIndex, 0, newHeading)
  newContent.splice(insertIndex + 1, 0, { type: 'paragraph', content: [{ type: 'text', text: '' }] })
  return { type: 'doc', content: newContent }
}

export function renameOutlineHeading(doc: TipTapDoc, blockIndex: number, newTitle: string): TipTapDoc {
  const node = doc.content[blockIndex]
  if (!node || node.type !== 'heading') return doc
  const updatedNode = {
    ...node,
    content: [{ type: 'text', text: newTitle }]
  }
  const newContent = [...doc.content]
  newContent[blockIndex] = updatedNode
  return { type: 'doc', content: newContent }
}

export function moveOutlineBlock(doc: TipTapDoc, fromIndex: number, toIndex: number): TipTapDoc {
  if (fromIndex === toIndex) return doc
  const content = [...doc.content]
  const [moved] = content.splice(fromIndex, 1)
  content.splice(toIndex, 0, moved)
  return { type: 'doc', content: content }
}

export function deleteOutlineBlock(doc: TipTapDoc, blockIndex: number): TipTapDoc {
  const newContent = [...doc.content]
  newContent.splice(blockIndex, 1)
  return { type: 'doc', content: newContent }
}

/* ---------------------------- */
/* WORKSPACE                   */
/* ---------------------------- */

function computeLengthStatus(wordCount: number): 'too-short' | 'optimal' | 'too-long' {
  if (wordCount < 10) return 'too-short'
  if (wordCount > 50) return 'too-long'
  return 'optimal'
}

export function getParagraphWorkspaces(doc: TipTapDoc): ParagraphWorkspaceItem[] {
  const result: ParagraphWorkspaceItem[] = []
  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i]
    if (node.type !== 'heading') continue
    const headingId = String(node.attrs?.id ?? `heading-${i}`)
    const level = Number(node.attrs?.level ?? 1) || 1

    const paragraphNode = doc.content[i + 1]
    if (!paragraphNode || paragraphNode.type !== 'paragraph') continue

    const paragraphText = collectText(paragraphNode.content)
    let sentences: SentenceItem[] = []

    // Use stored sentences if available (preserves IDs)
    const stored = paragraphNode.attrs?.sentenceItems as SentenceItem[] | undefined
    if (stored && stored.length) {
      sentences = stored
    } else {
      sentences = splitToSentences(paragraphText, headingId)
    }

    const wordCount = paragraphText.split(/\s+/).filter(Boolean).length
    const lengthStatus = computeLengthStatus(wordCount)

    result.push({
      id: `paragraph-${headingId}`,
      headingId,
      title: collectText(node.content),
      level,
      text: paragraphText,
      sentences,
      wordCount,
      lengthStatus,
    })
  }
  return result
}

export function removeParagraphByHeading(doc: TipTapDoc, headingId: string): TipTapDoc {
  const nodes = [...doc.content]
  const headingIndex = nodes.findIndex(n => n.type === 'heading' && n.attrs?.id === headingId)
  if (headingIndex === -1) return doc
  nodes.splice(headingIndex, 2)
  return { type: 'doc', content: nodes }
}

export function updateParagraphSentences(
  doc: TipTapDoc,
  headingId: string,
  newSentences: SentenceItem[],
): TipTapDoc {
  console.log('UPDATE PARAGRAPH')
  console.log('headingId', headingId)

  const nodes = [...doc.content]

  const headingIndex = nodes.findIndex(
    n => n.type === 'heading' && n.attrs?.id === headingId
  )

  console.log('headingIndex', headingIndex)

  if (headingIndex === -1) {
    console.log('HEADING NOT FOUND')
    return doc
  }

  const paragraphIndex = headingIndex + 1

  console.log('paragraphIndex', paragraphIndex)
  console.log('node', nodes[paragraphIndex])

  const newText = newSentences
    .map(s => s.text.trim())
    .filter(Boolean)
    .join(' ')

  console.log('newText', newText)
  console.log(
    nodes
      .filter(n => n.type === 'heading')
      .map(n => n.attrs)
  )
  const updatedParagraph: TipTapNode = {
    ...nodes[paragraphIndex],
    content: newText ? [{ type: 'text', text: newText }] : [],
    attrs: {
      ...nodes[paragraphIndex].attrs,
      sentenceItems: newSentences, // store for potential future use, but we ignore it in getParagraphWorkspaces
    },
  }

  const newContent = [...nodes]
  newContent[paragraphIndex] = updatedParagraph
  return { type: 'doc', content: newContent }
}

export function updateParagraphText(
  doc: TipTapDoc,
  headingId: string,
  text: string,
): TipTapDoc {
  const nodes = [...doc.content]
  const headingIndex = nodes.findIndex(n => n.type === 'heading' && n.attrs?.id === headingId)
  if (headingIndex === -1) return doc

  const paragraphIndex = headingIndex + 1
  if (paragraphIndex >= nodes.length || nodes[paragraphIndex].type !== 'paragraph') return doc

  // Update the paragraph content and remove stale sentenceItems
  const updatedParagraph: TipTapNode = {
    ...nodes[paragraphIndex],
    content: text ? [{ type: 'text', text }] : [],
    attrs: {
      ...nodes[paragraphIndex].attrs,
      sentenceItems: undefined, // ✅ forces fresh split in getParagraphWorkspaces
    },
  }

  const newContent = [...nodes]
  newContent[paragraphIndex] = updatedParagraph
  return { type: 'doc', content: newContent }
}

/* ---------------------------- */
/* PREVIEW & EXPORT            */
/* ---------------------------- */

export function docToPreviewBlocks(doc: TipTapDoc): PreviewBlock[] {
  return doc.content.flatMap((node, i): PreviewBlock[] => {
    const text = collectText(node.content).trim()
    if (!text) return []
    return node.type === 'heading'
      ? [{ id: `preview-${i}`, type: 'heading', level: Number(node.attrs?.level ?? 1) || 1, text }]
      : [{ id: `preview-${i}`, type: 'paragraph', level: 1, text }]
  })
}

export function buildDocxBlob(title: string, doc: TipTapDoc): Blob {
  const content = `<html><body><h1>${title}</h1>${docToPreviewBlocks(doc).map(b => 
    b.type === 'heading' ? `<h${b.level}>${b.text}</h${b.level}>` : `<p>${b.text}</p>`
  ).join('')}</body></html>`
  return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

/* ---------------------------- */
/* HELPERS                     */
/* ---------------------------- */

function collectText(nodes: TipTapNode[] = []): string {
  return nodes.map(n => n.text ?? collectText(n.content)).join(' ')
}


function sanitizeDoc(doc: TipTapDoc): TipTapDoc {
  return {
    type: 'doc',
    content: doc.content
      .map((node, index) => sanitizeNode(node, index))
      .filter(Boolean) as TipTapNode[],
  }
}

function sanitizeNode(
  node: TipTapNode,
  index = 0,
): TipTapNode | null {
  if (node.type === 'text') {
    return node.text?.trim() ? node : null
  }

  if (node.type === 'heading') {
    return {
      ...node,
      attrs: {
        ...node.attrs,
        id: node.attrs?.id ?? `heading-${index}`,
      },
      content: node.content
        ?.map((child, childIndex) => sanitizeNode(child, childIndex))
        .filter(Boolean) as TipTapNode[],
    }
  }

  return {
    ...node,
    content: node.content
      ?.map((child, childIndex) => sanitizeNode(child, childIndex))
      .filter(Boolean) as TipTapNode[],
  }
}