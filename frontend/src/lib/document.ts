import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx'

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
    const result = sanitizeDoc(value as TipTapDoc)
    console.log('normalizeDoc output:', result)
    return result
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
        newContent.push({ type: 'paragraph', content: [] })
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
  let paragraphIndex = 0

  for (const node of doc.content) {
    if (node.type === 'paragraph') {
      const text = collectText(node.content)

      const rawSentences =
        splitToSentences(text, `paragraph-${paragraphIndex}`, paragraphIndex,)

      rawSentences.forEach(
        (s, sentenceIndex) => {
          sentences.push({
            id: `sent-${idCounter++}`,
            text: s.text,
            paragraphIndex,
            sentenceIndex,
          })
        },
      )

      paragraphIndex++
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
      title: collectText(node.content).trim(),
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
  newContent.splice(insertIndex + 1, 0, { type: 'paragraph', content: [] })
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

export function moveOutlineBlock(
  doc: TipTapDoc,
  fromBlockIndex: number,
  toBlockIndex: number,
): TipTapDoc {
  const sections: TipTapNode[][] = []

  let i = 0

  while (i < doc.content.length) {
    const node = doc.content[i]

    if (node.type !== 'heading') {
      i++
      continue
    }

    const section: TipTapNode[] = [node]

    let j = i + 1

    while (
      j < doc.content.length &&
      doc.content[j].type !== 'heading'
    ) {
      section.push(doc.content[j])
      j++
    }

    sections.push(section)
    i = j
  }

  const fromSectionIndex = sections.findIndex(
    section =>
      doc.content[fromBlockIndex] === section[0],
  )

  const toSectionIndex = sections.findIndex(
    section =>
      doc.content[toBlockIndex] === section[0],
  )

  if (
    fromSectionIndex === -1 ||
    toSectionIndex === -1
  ) {
    return doc
  }

  const [moved] = sections.splice(
    fromSectionIndex,
    1,
  )

  sections.splice(
    toSectionIndex,
    0,
    moved,
  )

  return {
    type: 'doc',
    content: sections.flat(),
  }
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

export function getParagraphWorkspaces(
  doc: TipTapDoc,
): ParagraphWorkspaceItem[] {
  const result: ParagraphWorkspaceItem[] = []

  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i]

    if (node.type !== 'heading') continue

    const headingId = String(
      node.attrs?.id ?? `heading-${i}`,
    )

    const level =
      Number(node.attrs?.level ?? 1) || 1

    const sentences: SentenceItem[] = []

    let combinedText = ''

    let j = i + 1

    while (
      j < doc.content.length &&
      doc.content[j].type !== 'heading'
    ) {
      const current = doc.content[j]

      if (current.type === 'paragraph') {
        const paragraphText =
          collectText(current.content)

        combinedText +=
          (combinedText ? '\n\n' : '') +
          paragraphText

        const split =
          splitToSentences(
            paragraphText,
            headingId,
            j
          )

        split.forEach(
          (sentence, sentenceIndex) => {
            sentences.push({
              ...sentence,
              paragraphIndex: j,
              sentenceIndex,
            })
          },
        )
      }

      j++
    }

    const wordCount = combinedText
      .split(/\s+/)
      .filter(Boolean).length

    const lengthStatus =
      computeLengthStatus(wordCount)

    result.push({
      id: `paragraph-${headingId}`,
      headingId,
      title: collectText(node.content),
      level,
      text: combinedText,
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
  const nodes = [...doc.content]

  const grouped =
    new Map<number, SentenceItem[]>()

  for (const sentence of newSentences) {
    const current =
      grouped.get(
        sentence.paragraphIndex,
      ) ?? []

    current.push(sentence)

    grouped.set(
      sentence.paragraphIndex,
      current,
    )
  }

  for (const [
    paragraphIndex,
    sentences,
  ] of grouped) {
    const text = sentences
      .map(s => s.text.trim())
      .filter(Boolean)
      .join(' ')

    nodes[paragraphIndex] = {
      ...nodes[paragraphIndex],
      content: text
        ? [
            {
              type: 'text',
              text,
            },
          ]
        : [],
    }
  }

  return {
    type: 'doc',
    content: nodes,
  }
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
  }

  const newContent = [...nodes]
  newContent[paragraphIndex] = updatedParagraph
  return { type: 'doc', content: newContent }
}

/* ---------------------------- */
/* PREVIEW & EXPORT            */
/* ---------------------------- */

function tiptapNodeToHtml(
  node: TipTapNode,
): string {
  if (node.type === 'text') {
    let text = node.text ?? ''

    if (node.marks?.some(m => m.type === 'bold')) {
      text = `<strong>${text}</strong>`
    }

    if (node.marks?.some(m => m.type === 'italic')) {
      text = `<em>${text}</em>`
    }

    return text
  }

  if (node.type === 'paragraph') {
    return `<p>${
      node.content
        ?.map(tiptapNodeToHtml)
        .join('') ?? ''
    }</p>`
  }

  if (node.type === 'heading') {
    const level =
      Number(node.attrs?.level ?? 1)

    return `<h${level}>${
      node.content
        ?.map(tiptapNodeToHtml)
        .join('') ?? ''
    }</h${level}>`
  }

  return (
    node.content
      ?.map(tiptapNodeToHtml)
      .join('') ?? ''
  )
}

export function docToHtml(
  doc: TipTapDoc,
): string {
  return doc.content
    .map(tiptapNodeToHtml)
    .join('')
}

export function docToPreviewBlocks(doc: TipTapDoc): PreviewBlock[] {
  return doc.content.flatMap((node, i): PreviewBlock[] => {
    const text = collectText(node.content).trim()
    if (!text) return []
    return node.type === 'heading'
      ? [{ id: `preview-${i}`, type: 'heading', level: Number(node.attrs?.level ?? 1) || 1, text }]
      : [{ id: `preview-${i}`, type: 'paragraph', level: 1, text }]
  })
}

function nodeToRuns(node: TipTapNode): TextRun[] {
  if (node.type === 'text') {
    return [
      new TextRun({
        text: node.text ?? '',
        bold: node.marks?.some(
          mark => mark.type === 'bold',
        ),
        italics: node.marks?.some(
          mark => mark.type === 'italic',
        ),
      }),
    ]
  }

  return (
    node.content?.flatMap(nodeToRuns) ?? []
  )
}

export async function buildDocxBlob(
  title: string,
  doc: TipTapDoc,
): Promise<Blob> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(title)],
    }),
  )

  for (const node of doc.content) {
    if (node.type === 'heading') {
      const level =
        Number(node.attrs?.level ?? 1)

      const headingMap = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      }

      children.push(
        new Paragraph({
          heading:
            headingMap[
              level as keyof typeof headingMap
            ] ?? HeadingLevel.HEADING_1,
          children:
            node.content?.flatMap(
              nodeToRuns,
            ) ?? [],
        }),
      )

      continue
    }

    if (node.type === 'paragraph') {
      children.push(
        new Paragraph({
          children:
            node.content?.flatMap(
              nodeToRuns,
            ) ?? [],
        }),
      )
    }
  }

  const document = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  return await Packer.toBlob(document)
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
    if (!node.text?.length) return null

    return {
      ...node,
      marks: node.marks,
    }
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