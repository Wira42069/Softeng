// Citation sources stored on Draft.sources (JSON). Keep in sync with
// frontend/src/lib/citations.ts.

export interface Source {
  id: string
  authors: string[] // each as "Family, Given"
  title: string
  year: string
  container: string // journal, website or publisher
  url: string
  doi: string
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Returns null when the payload is not a usable list.
export function sanitizeSources(input: unknown): Source[] | null {
  if (!Array.isArray(input) || input.length > 200) return null

  return input.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const authors = Array.isArray(item.authors)
      ? item.authors.map((author) => clip(author, 120)).filter(Boolean).slice(0, 30)
      : []

    return {
      id: clip(item.id, 64) || `src-${index}`,
      authors,
      title: clip(item.title, 500),
      year: clip(item.year, 10),
      container: clip(item.container, 300),
      url: clip(item.url, 500),
      doi: clip(item.doi, 200),
    }
  })
}
