// Citation sources and APA 7 / MLA 9 formatting. Keep the Source shape in sync with
// backend/src/lib/sources.ts. Formatting here is intentionally simple and covers the
// common cases (journal articles, web pages, books); it is not a full CSL engine.

export interface Source {
  id: string
  authors: string[] // each as "Family, Given"
  title: string
  year: string
  container: string // journal, website or publisher
  url: string
  doi: string
}

export type CitationStyle = 'apa' | 'mla'

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
]

export function emptySource(): Source {
  return {
    id: `src-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    authors: [],
    title: '',
    year: '',
    container: '',
    url: '',
    doi: '',
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseAuthor(raw: string): { family: string; given: string } {
  const [family, ...rest] = raw.split(',')
  return { family: family.trim(), given: rest.join(',').trim() }
}

function initials(given: string): string {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ')
}

function endWithPeriod(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function shortTitle(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  return words.length > 4 ? `${words.slice(0, 4).join(' ')}...` : words.join(' ')
}

function link(source: Source): string {
  return source.doi ? `https://doi.org/${source.doi}` : source.url
}

function lastNames(source: Source): string[] {
  return source.authors.map((author) => parseAuthor(author).family).filter(Boolean)
}

/* ---------------------------- */
/* IN-TEXT CITATIONS            */
/* ---------------------------- */

export function inTextCitation(source: Source, style: CitationStyle): string {
  const names = lastNames(source)

  if (style === 'mla') {
    if (names.length === 0) return `("${shortTitle(source.title) || 'Untitled'}")`
    if (names.length === 1) return `(${names[0]})`
    if (names.length === 2) return `(${names[0]} and ${names[1]})`
    return `(${names[0]} et al.)`
  }

  const year = source.year || 'n.d.'
  if (names.length === 0) return `(${shortTitle(source.title) || 'Untitled'}, ${year})`
  if (names.length === 1) return `(${names[0]}, ${year})`
  if (names.length === 2) return `(${names[0]} & ${names[1]}, ${year})`
  return `(${names[0]} et al., ${year})`
}

/* ---------------------------- */
/* REFERENCE LIST ENTRIES       */
/* ---------------------------- */

function apaAuthor(raw: string): string {
  const { family, given } = parseAuthor(raw)
  return given ? `${family}, ${initials(given)}` : family
}

function apaAuthors(authors: string[]): string {
  const list = authors.map(apaAuthor).filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]}, & ${list[1]}`
  if (list.length > 20) return `${list.slice(0, 19).join(', ')}, . . . ${list[list.length - 1]}`
  return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`
}

function apaReference(source: Source): string {
  const authors = apaAuthors(source.authors)
  const year = source.year || 'n.d.'
  const title = endWithPeriod(source.title)
  const container = endWithPeriod(source.container)
  const tail = [container, link(source)].filter(Boolean).join(' ')

  const head = authors ? `${authors} (${year}). ${title}` : `${title} (${year}).`
  return [head, tail].filter(Boolean).join(' ').trim()
}

function mlaAuthors(authors: string[]): string {
  const list = authors.map(parseAuthor).filter((author) => author.family)
  if (list.length === 0) return ''

  const first = list[0].given ? `${list[0].family}, ${list[0].given}` : list[0].family
  if (list.length === 1) return endWithPeriod(first)
  if (list.length === 2) {
    const second = list[1].given ? `${list[1].given} ${list[1].family}` : list[1].family
    return endWithPeriod(`${first}, and ${second}`)
  }
  return `${first}, et al.`
}

function mlaReference(source: Source): string {
  const authors = mlaAuthors(source.authors)
  const title = source.title ? `"${endWithPeriod(source.title)}"` : ''
  const tail = endWithPeriod([source.container, source.year, link(source)].filter(Boolean).join(', '))
  return [authors, title, tail].filter(Boolean).join(' ').trim()
}

export function referenceText(source: Source, style: CitationStyle): string {
  return style === 'mla' ? mlaReference(source) : apaReference(source)
}

export function referenceListTitle(style: CitationStyle): string {
  return style === 'mla' ? 'Works Cited' : 'References'
}

function sortKey(source: Source): string {
  return (lastNames(source)[0] ?? source.title).toLowerCase()
}

// Alphabetical, as both APA and MLA require. Sources with no content are skipped.
export function referenceEntries(sources: Source[], style: CitationStyle): string[] {
  return sources
    .filter((source) => source.title.trim() || source.authors.length > 0)
    .slice()
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .map((source) => referenceText(source, style))
}

// HTML appended to the preview and the PDF export. All text is escaped.
export function referencesHtml(sources: Source[], style: CitationStyle): string {
  const entries = referenceEntries(sources, style)
  if (entries.length === 0) return ''
  const items = entries.map((entry) => `<p>${escapeHtml(entry)}</p>`).join('')
  return `<h2>${escapeHtml(referenceListTitle(style))}</h2>${items}`
}

/* ---------------------------- */
/* PER-BROWSER STYLE PREFERENCE */
/* ---------------------------- */

const STYLE_KEY = 'flowdraft-citation-style'

export function loadCitationStyle(): CitationStyle {
  try {
    return localStorage.getItem(STYLE_KEY) === 'mla' ? 'mla' : 'apa'
  } catch {
    return 'apa'
  }
}

export function saveCitationStyle(style: CitationStyle): void {
  try {
    localStorage.setItem(STYLE_KEY, style)
  } catch {
    // storage unavailable; the choice just won't persist
  }
}
