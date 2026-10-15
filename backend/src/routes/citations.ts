import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireUser, userOf } from '../lib/guards.js'
import { lookupLimiter } from '../lib/limiters.js'
import { sanitizeSources, type Source } from '../lib/sources.js'

// Mounted at /api.
export const citationsRouter = Router()

// Save the source list for one draft. updatedAt is deliberately left unchanged so the
// editor's autosave conflict check (lastKnownUpdatedAt) keeps working.
citationsRouter.put('/drafts/:id/sources', requireUser, async (req, res) => {
  try {
    const sources = sanitizeSources(req.body?.sources)
    if (!sources) return res.status(400).json({ error: 'Invalid sources.' })

    const draft = await prisma.draft.findFirst({
      where: { id: String(req.params.id), userId: userOf(res).id },
      select: { id: true, updatedAt: true },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        sources: sources as unknown as Prisma.InputJsonValue,
        updatedAt: draft.updatedAt,
      },
    })
    res.json({ sources })
  } catch (error) {
    console.error('Saving sources failed', error)
    res.status(500).json({ error: 'Could not save sources.' })
  }
})

function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
}

interface CrossrefAuthor {
  family?: string
  given?: string
  name?: string
}

interface CrossrefWork {
  title?: string[]
  author?: CrossrefAuthor[]
  issued?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  'container-title'?: string[]
  publisher?: string
  URL?: string
  DOI?: string
}

function yearOf(work: CrossrefWork): string {
  const parts =
    work.issued?.['date-parts']?.[0] ??
    work['published-print']?.['date-parts']?.[0] ??
    work['published-online']?.['date-parts']?.[0]
  return parts?.[0] ? String(parts[0]) : ''
}

// Look up article details from Crossref (free, no API key). Returns a source without an id.
citationsRouter.get('/citations/doi', requireUser, lookupLimiter, async (req, res) => {
  try {
    const doi = normalizeDoi(typeof req.query.doi === 'string' ? req.query.doi : '')
    if (!/^10\.\d{4,9}\/\S+$/.test(doi)) {
      return res.status(400).json({ error: 'That does not look like a DOI (e.g. 10.1000/xyz123).' })
    }

    const mailto = process.env.CROSSREF_MAILTO
    const response = await fetch(
      `https://api.crossref.org/works/${doi.split('/').map(encodeURIComponent).join('/')}`,
      {
        headers: { 'User-Agent': mailto ? `FlowDraft/1.0 (mailto:${mailto})` : 'FlowDraft/1.0' },
        signal: AbortSignal.timeout(8000),
      },
    )

    if (response.status === 404) return res.status(404).json({ error: 'DOI not found.' })
    if (!response.ok) return res.status(502).json({ error: 'Citation lookup is unavailable right now.' })

    const body = (await response.json()) as { message?: CrossrefWork }
    const work = body.message ?? {}

    const source: Omit<Source, 'id'> = {
      authors: (work.author ?? [])
        .map((author) =>
          author.family
            ? `${author.family}${author.given ? `, ${author.given}` : ''}`
            : (author.name ?? ''),
        )
        .filter(Boolean),
      title: work.title?.[0] ?? '',
      year: yearOf(work),
      container: work['container-title']?.[0] ?? work.publisher ?? '',
      url: work.URL ?? `https://doi.org/${doi}`,
      doi: work.DOI ?? doi,
    }
    res.json({ source })
  } catch (error) {
    console.error('DOI lookup failed', error)
    res.status(502).json({ error: 'Citation lookup is unavailable right now.' })
  }
})
