import type { OutlineItem, ParagraphWorkspaceItem, PreviewBlock, SentenceItem, TipTapDoc, TipTapNode } from '../types'

export const emptyDoc: TipTapDoc = {
  type: 'doc',
  content: [],
}

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

export function serializeDoc(doc: TipTapDoc) {
  return JSON.stringify(doc)
}

export function docToText(doc: TipTapDoc) {
  return collectText(doc.content).replace(/\s+/g, ' ').trim()
}

export function countWords(doc: TipTapDoc) {
  const text = docToText(doc)
  return text ? text.split(/\s+/).length : 0
}

export function countCharacters(doc: TipTapDoc) {
  return docToText(doc).length
}

export function getSearchMatchCount(doc: TipTapDoc, query: string) {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return 0
  }

  const haystack = docToText(doc).toLowerCase()
  let count = 0
  let index = haystack.indexOf(needle)

  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }

  return count
}

export function docToSentenceItems(doc: TipTapDoc): SentenceItem[] {
  return splitSentences(docToText(doc)).map((text, index) => ({
    id: `sentence-${index}`,
    text,
  }))
}

export function sentencesToDoc(sentences: SentenceItem[]): TipTapDoc {
  const text = sentences.map((sentence) => sentence.text.trim()).filter(Boolean).join(' ')

  return text
    ? {
        type: 'doc',
        content: [paragraphNode(text)],
      }
    : emptyDoc
}

export function getOutlineCount(doc: TipTapDoc) {
  return doc.content.filter((node) => {
    if (node.type !== 'heading') return false
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1
    return level === 1
  }).length
}

export function extractOutline(doc: TipTapDoc): OutlineItem[] {
  const headings = doc.content.flatMap((node, index) => {
    if (node.type !== 'heading') {
      return []
    }

    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1

    return [{
      id: `outline-${index}`,
      title: collectText(node.content) || `Section ${index + 1}`,
      level,
      blockIndex: index,
    }]
  })

  if (headings.length > 0) {
    return headings
  }

  return [{
    id: 'outline-empty',
    title: 'Draft Body',
    level: 1,
    blockIndex: -1,
  }]
}

export function addOutlineHeading(doc: TipTapDoc, level: number, afterBlockIndex?: number): TipTapDoc {
  const sourceContent = doc.content
  const nextNodes = [
    headingNode(`New ${level === 1 ? 'Chapter' : 'Subchapter'}`, level),
    paragraphNode(''),
  ]
  const insertIndex = getOutlineInsertIndex(sourceContent, level, afterBlockIndex)
  const nextContent = [
    ...sourceContent.slice(0, insertIndex),
    ...nextNodes,
    ...sourceContent.slice(insertIndex),
  ]

  return {
    type: 'doc',
    content: nextContent,
  }
}

export function renameOutlineHeading(doc: TipTapDoc, blockIndex: number, title: string): TipTapDoc {
  const sourceContent = doc.content

  if (blockIndex < 0 || !sourceContent[blockIndex]) {
    return doc
  }

  const nextContent = sourceContent.map((node, index) => {
    if (index !== blockIndex || node.type !== 'heading') {
      return node
    }

    return {
      ...node,
      content: title ? [textNode(title)] : [],
    }
  })

  return {
    type: 'doc',
    content: nextContent,
  }
}

export function moveOutlineBlock(doc: TipTapDoc, fromBlockIndex: number, toBlockIndex: number): TipTapDoc {
  const sourceContent = doc.content

  if (fromBlockIndex < 0 || toBlockIndex < 0 || fromBlockIndex === toBlockIndex) {
    return doc
  }

  const fromBlock = getOutlineBlock(sourceContent, fromBlockIndex)
  const toBlock = getOutlineBlock(sourceContent, toBlockIndex)

  if (!fromBlock || !toBlock) {
    return doc
  }

  if (toBlock.start > fromBlock.start && toBlock.start < fromBlock.end) {
    return doc
  }

  const movingNodes = sourceContent.slice(fromBlock.start, fromBlock.end)
  const withoutMovingNodes = [
    ...sourceContent.slice(0, fromBlock.start),
    ...sourceContent.slice(fromBlock.end),
  ]
  const removedCount = fromBlock.end - fromBlock.start
  const targetIndex = toBlock.start > fromBlock.start
    ? toBlock.end - removedCount
    : toBlock.start

  return {
    type: 'doc',
    content: [
      ...withoutMovingNodes.slice(0, targetIndex),
      ...movingNodes,
      ...withoutMovingNodes.slice(targetIndex),
    ],
  }
}

function getSequentialBlock(nodes: TipTapNode[], headingIndex: number) {
  if (headingIndex < 0 || !nodes[headingIndex] || nodes[headingIndex].type !== 'heading') {
    return null
  }
  let end = headingIndex + 1
  while (end < nodes.length && nodes[end].type !== 'heading') {
    end++
  }
  return { start: headingIndex, end }
}

export function moveSequentialBlock(doc: TipTapDoc, fromHeadingIndex: number, toHeadingIndex: number): TipTapDoc {
  const sourceContent = doc.content

  if (fromHeadingIndex < 0 || toHeadingIndex < 0 || fromHeadingIndex === toHeadingIndex) {
    return doc
  }

  const fromBlock = getSequentialBlock(sourceContent, fromHeadingIndex)
  const toBlock = getSequentialBlock(sourceContent, toHeadingIndex)

  if (!fromBlock || !toBlock) {
    return doc
  }

  const movingNodes = sourceContent.slice(fromBlock.start, fromBlock.end)
  const withoutMovingNodes = [
    ...sourceContent.slice(0, fromBlock.start),
    ...sourceContent.slice(fromBlock.end),
  ]
  const removedCount = fromBlock.end - fromBlock.start
  const targetIndex = toBlock.start > fromBlock.start
    ? toBlock.end - removedCount
    : toBlock.start

  return {
    type: 'doc',
    content: [
      ...withoutMovingNodes.slice(0, targetIndex),
      ...movingNodes,
      ...withoutMovingNodes.slice(targetIndex),
    ],
  }
}

export function deleteOutlineBlock(doc: TipTapDoc, headingIndex: number): TipTapDoc {
  const sourceContent = doc.content
  const block = getOutlineBlock(sourceContent, headingIndex)

  if (!block) {
    return doc
  }

  return {
    type: 'doc',
    content: [
      ...sourceContent.slice(0, block.start),
      ...sourceContent.slice(block.end),
    ],
  }
}

export function ensureParagraphWorkspaces(doc: TipTapDoc): TipTapDoc {
  const nextContent: TipTapNode[] = []

  doc.content.forEach((node, index) => {
    nextContent.push(node)

    if (node.type === 'heading' && doc.content[index + 1]?.type === 'heading') {
      nextContent.push(paragraphNode(''))
    }
  })

  if (nextContent.at(-1)?.type === 'heading') {
    nextContent.push(paragraphNode(''))
  }

  return {
    type: 'doc',
    content: nextContent,
  }
}

export function getParagraphWorkspaces(doc: TipTapDoc): ParagraphWorkspaceItem[] {
  const normalizedDoc = ensureParagraphWorkspaces(doc)
  const seenIds = new Set<string>()

  return normalizedDoc.content.flatMap((node, index) => {
    if (node.type !== 'heading') {
      return []
    }

    const paragraphNodes = []
    let nextIndex = index + 1
    while (normalizedDoc.content[nextIndex] && normalizedDoc.content[nextIndex].type !== 'heading') {
      if (normalizedDoc.content[nextIndex].type === 'paragraph') {
        paragraphNodes.push(normalizedDoc.content[nextIndex])
      }
      nextIndex++
    }

    const text = paragraphNodes.map((n) => collectText(n.content)).join('\n\n')
    const wordCount = text ? text.split(/\s+/).length : 0
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1

    const title = collectText(node.content) || `Section ${index + 1}`
    let baseId = `paragraph-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    if (!baseId || baseId === 'paragraph-') {
      baseId = 'paragraph-untitled'
    }
    let id = baseId
    let counter = 1
    while (seenIds.has(id)) {
      id = `${baseId}-${counter}`
      counter++
    }
    seenIds.add(id)

    return [{
      id,
      title: collectText(node.content) || `Section ${index + 1}`,
      level,
      headingIndex: index,
      paragraphIndex: index, // Kept for compatibility, but we use headingIndex
      text,
      wordCount,
      lengthStatus: getParagraphLengthStatus(wordCount),
    }]
  })
}

export function updateParagraphWorkspace(doc: TipTapDoc, headingIndex: number, text: string): TipTapDoc {
  const normalizedDoc = ensureParagraphWorkspaces(doc)

  if (headingIndex < 0 || !normalizedDoc.content[headingIndex]) {
    return normalizedDoc
  }

  const paragraphs = text.split(/\n\n+/).map((p) => paragraphNode(p))

  const nextContent = []
  for (let i = 0; i <= headingIndex; i++) {
    nextContent.push(normalizedDoc.content[i])
  }

  nextContent.push(...paragraphs)

  let i = headingIndex + 1
  while (normalizedDoc.content[i] && normalizedDoc.content[i].type !== 'heading') {
    i++
  }

  while (i < normalizedDoc.content.length) {
    nextContent.push(normalizedDoc.content[i])
    i++
  }

  return {
    type: 'doc',
    content: nextContent,
  }
}

export function updateParagraphSentences(doc: TipTapDoc, headingIndex: number, sentences: SentenceItem[]): TipTapDoc {
  let text = ''
  sentences.forEach((sentence, i) => {
    if (sentence.text.startsWith('\n')) {
      text += sentence.text
    } else {
      if (i > 0 && !sentences[i - 1].text.startsWith('\n')) {
        text += ' '
      }
      text += sentence.text.trim()
    }
  })
  return updateParagraphWorkspace(doc, headingIndex, text)
}

export function docToPreviewBlocks(doc: TipTapDoc): PreviewBlock[] {
  return doc.content.flatMap<PreviewBlock>((node, index) => {
    const text = collectText(node.content).trim()

    if (!text) {
      return []
    }

    if (node.type === 'heading') {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1
      return [{ id: `preview-${index}`, type: 'heading', level, text }]
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return [{ id: `preview-${index}`, type: 'list', level: 1, text }]
    }

    return [{ id: `preview-${index}`, type: 'paragraph', level: 1, text }]
  })
}

export function markdownFromDoc(doc: TipTapDoc) {
  return doc.content.map((node) => nodeToMarkdown(node)).filter(Boolean).join('\n\n')
}

/**
 * Calls the Anthropic API to generate three rewrites of the given sentence:
 * a more concise version, a more formal version, and a more vivid version.
 * Falls back to basic local rewrites if the API call fails.
 */
export async function makeSentenceVariations(sentence: string): Promise<string[]> {
  const trimmed = sentence.trim()
  if (!trimmed) return []

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Rewrite the following sentence in exactly three different ways:
1. More concise (remove filler, tighten the phrasing)
2. More formal (academic or professional register)
3. More vivid (stronger word choices, more descriptive)

Return ONLY a JSON array of three strings, no explanation, no markdown, no backticks.
Example output: ["Concise version.", "Formal version.", "Vivid version."]

Sentence to rewrite: "${trimmed.replace(/"/g, '\"')}"`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`API error ${response.status}`)

    const data = await response.json()
    const text = (data.content as Array<{ type: string; text: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const clean = text.replace(/```json|```/g, '').trim()
    const parsed: unknown = JSON.parse(clean)

    if (
      Array.isArray(parsed) &&
      parsed.length >= 2 &&
      parsed.every((v) => typeof v === 'string' && v.trim())
    ) {
      return (parsed as string[]).slice(0, 3)
    }
  } catch {
    // Fall through to local fallback below
  }

  // Local fallback: basic rewrites when the API is unavailable
  const compact = trimmed
    .replace(/\b(really|very|actually|basically|just|quite|rather|simply)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const formal = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return Array.from(new Set([compact, formal].filter(Boolean)))
}

export function buildDocxBlob(title: string, doc: TipTapDoc) {
  function nodeToDocxXml(node: TipTapNode): string {
    const isBold = node.marks?.some((m) => m.type === 'bold')
    const isItalic = node.marks?.some((m) => m.type === 'italic')
    const colorMark = node.marks?.find((m) => m.type === 'textStyle' && m.attrs?.color)
    const color = typeof colorMark?.attrs?.color === 'string'
      ? colorMark.attrs.color.replace('#', '')
      : null

    if (node.type === 'text' && node.text) {
      const rPr = [
        isBold ? '<w:b/>' : '',
        isItalic ? '<w:i/>' : '',
        color ? `<w:color w:val="${color}"/>` : '',
      ].filter(Boolean).join('')
      return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(node.text)}</w:t></w:r>`
    }

    if (node.type === 'hardBreak') return '<w:br/>'

    return (node.content ?? []).map(nodeToDocxXml).join('')
  }

  function blockToDocxXml(node: TipTapNode): string {
    if (node.type === 'heading') {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1
      const styleId = level === 1 ? 'Heading1' : level === 2 ? 'Heading2' : 'Heading3'
      const inner = (node.content ?? []).map(nodeToDocxXml).join('')
      return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>${inner}</w:p>`
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return (node.content ?? []).map((li) => {
        const inner = (li.content ?? []).flatMap((c) => c.content ?? []).map(nodeToDocxXml).join('')
        return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t xml:space="preserve">• </w:t></w:r>${inner}</w:p>`
      }).join('')
    }

    const inner = (node.content ?? []).map(nodeToDocxXml).join('')
    return `<w:p>${inner}</w:p>`
  }

  const bodyXml = [
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`,
    ...doc.content.map(blockToDocxXml),
  ].join('')

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`

  return new Blob([createZip([
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    {
      path: 'word/document.xml',
      content: documentXml,
    },
  ])], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

function collectText(nodes: TipTapNode[] = []): string {
  return nodes.map((node) => {
    if (node.text) {
      return node.text
    }

    return collectText(node.content)
  }).join(' ')
}

function splitSentences(text: string) {
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
  return tokens
}

function textNode(text: string): TipTapNode {
  return {
    type: 'text',
    text,
  }
}

function paragraphNode(text: string): TipTapNode {
  return {
    type: 'paragraph',
    ...(text ? { content: [textNode(text)] } : {}),
  }
}

function sanitizeDoc(doc: TipTapDoc): TipTapDoc {
  return {
    type: 'doc',
    content: doc.content.map(sanitizeNode).filter((node): node is TipTapNode => Boolean(node)),
  }
}

function sanitizeNode(node: TipTapNode): TipTapNode | null {
  if (node.type === 'text') {
    return node.text ? node : null
  }

  const content = node.content
    ?.map(sanitizeNode)
    .filter((child): child is TipTapNode => Boolean(child))

  return {
    ...node,
    ...(content ? { content } : {}),
  }
}

function getOutlineInsertIndex(nodes: TipTapNode[], level: number, afterBlockIndex?: number) {
  if (typeof afterBlockIndex !== 'number' || afterBlockIndex < 0 || nodes[afterBlockIndex]?.type !== 'heading') {
    return nodes.length
  }

  const selectedLevel = getHeadingLevel(nodes[afterBlockIndex])
  const anchorIndex = level === 1 && selectedLevel > 1
    ? findParentHeadingIndex(nodes, afterBlockIndex, 1) ?? afterBlockIndex
    : afterBlockIndex

  if (level === 2 && selectedLevel === 1) {
    return getOutlineBlock(nodes, anchorIndex)?.end ?? nodes.length
  }

  return getOutlineBlock(nodes, anchorIndex)?.end ?? nodes.length
}

function getOutlineBlock(nodes: TipTapNode[], headingIndex: number) {
  const heading = nodes[headingIndex]

  if (!heading || heading.type !== 'heading') {
    return null
  }

  const level = getHeadingLevel(heading)
  let end = headingIndex + 1

  while (end < nodes.length) {
    const node = nodes[end]

    if (node.type === 'heading' && getHeadingLevel(node) <= level) {
      break
    }

    end += 1
  }

  return {
    start: headingIndex,
    end,
  }
}

function getHeadingLevel(node: TipTapNode) {
  return typeof node.attrs?.level === 'number' ? node.attrs.level : 1
}

function findParentHeadingIndex(nodes: TipTapNode[], fromIndex: number, parentLevel: number) {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    const node = nodes[index]

    if (node.type !== 'heading') {
      continue
    }

    const level = getHeadingLevel(node)

    if (level === parentLevel) {
      return index
    }

    if (level < parentLevel) {
      return null
    }
  }

  return null
}

function getParagraphLengthStatus(wordCount: number): ParagraphWorkspaceItem['lengthStatus'] {
  if (wordCount < 80) {
    return 'too-short'
  }

  if (wordCount > 180) {
    return 'too-long'
  }

  return 'optimal'
}

function headingNode(text: string, level: number): TipTapNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [textNode(text)],
  }
}

function nodeToMarkdown(node: TipTapNode): string {
  const text = collectText(node.content).trim()

  if (!text) {
    return ''
  }

  if (node.type === 'heading') {
    const level = typeof node.attrs?.level === 'number' ? Math.min(Math.max(node.attrs.level, 1), 6) : 1
    return `${'#'.repeat(level)} ${text}`
  }

  return text
}



function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createZip(files: { path: string; content: string }[]) {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path)
    const contentBytes = encoder.encode(file.content)
    const checksum = crc32(contentBytes)
    const localHeader = concatBytes(
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(contentBytes.length),
      uint32(contentBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
    )

    localParts.push(localHeader, contentBytes)

    centralParts.push(concatBytes(
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(contentBytes.length),
      uint32(contentBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes,
    ))

    offset += localHeader.length + contentBytes.length
  })

  const centralDirectory = concatBytes(...centralParts)
  const endRecord = concatBytes(
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  )

  return concatBytes(...localParts, centralDirectory, endRecord)
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function uint16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff])
}

function uint32(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ])
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0

  parts.forEach((part) => {
    merged.set(part, offset)
    offset += part.length
  })

  return merged
}
