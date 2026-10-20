import 'dotenv/config'
import express from 'express'
import cors from 'cors'
// import helmet from 'helmet'
import helmet = require('helmet');
import morgan from 'morgan'
import { Prisma } from '@prisma/client'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import { prisma } from './lib/prisma.js'
import { getCurrentUser } from './lib/currentUser.js'
import { requirePro } from './lib/guards.js'
import { aiLimiter } from './lib/limiters.js'
import { FREE_DRAFT_LIMIT } from './lib/plans.js'
import { billingRouter, stripeWebhook } from './routes/billing.js'
import { citationsRouter } from './routes/citations.js'
import { supportRouter } from './routes/support.js'
import { Groq } from 'groq-sdk'

const app = express()
// Behind Vercel's proxy: needed so rate limiting sees the real client IP.
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3000
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Middleware
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    }
  : { origin: true, credentials: true }
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors(corsOptions))
app.use(morgan('dev'))

// Mount Better-Auth handler
app.use('/api/auth', toNodeHandler(auth))

// Stripe webhook needs the raw request body, so it must come BEFORE express.json().
app.post('/api/billing/webhook', stripeWebhook)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Plans & billing, feedback/admin, and citations (see routes/).
app.use('/api/billing', billingRouter)
app.use('/api', supportRouter)
app.use('/api', citationsRouter)

// ── Helpers ────────────────────────────────────────────────────────────────

// Session resolver utility
async function getSessionUser(req: express.Request) {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  })
  return session?.user ?? null
}

// Central error handler — converts Prisma errors to appropriate HTTP responses
// and prevents unhandled rejections from crashing the server.
function handleError(res: express.Response, error: unknown) {
  console.error(error)

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A record with that value already exists.' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found.' })
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Invalid data provided.' })
  }

  return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
}

// ── Health check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── User profile ───────────────────────────────────────────────────────────

app.get('/api/me', async (req, res) => {
  try {
    const user = await getCurrentUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draftCount = await prisma.draft.count({ where: { userId: user.id } })

    res.json({
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      image: user.image,
      plan: user.isPro ? 'pro' : 'free',
      role: user.isAdmin ? 'admin' : 'user',
      draftCount,
      draftLimit: user.isPro ? null : FREE_DRAFT_LIMIT,
    })
  } catch (error) {
    handleError(res, error)
  }
})

app.patch('/api/me', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const nickname = typeof req.body.nickname === 'string'
      ? req.body.nickname.trim()
      : undefined

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(nickname !== undefined ? { nickname: nickname || null } : {}),
      },
      select: { id: true, name: true, nickname: true, email: true, image: true },
    })

    res.json(profile)
  } catch (error) {
    handleError(res, error)
  }
})


// ── Helpers for drafts ────────────────────────────────────────────────────

function extractText(nodes: any[] = []): string {
  return nodes
    .map(node =>
      node.type === 'text'
        ? node.text ?? ''
        : extractText(node.content)
    )
    .join(' ')
}

function countWords(doc: any): number {
  const text = extractText(doc?.content ?? [])

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

// ── Drafts ─────────────────────────────────────────────────────────────────

app.get('/api/drafts', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const drafts = await prisma.draft.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, updatedAt: true, createdAt: true,
        topic: true, deadline: true, starred: true, content: true,
      },
    })
    res.json(
      drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        updatedAt: draft.updatedAt,
        createdAt: draft.createdAt,
        topic: draft.topic,
        deadline: draft.deadline,
        starred: draft.starred,
        wordCount: countWords(draft.content),
      }))
    )
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/drafts', async (req, res) => {
  try {
    const user = await getCurrentUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    // Free plan: at most FREE_DRAFT_LIMIT drafts. Enforced here, not just in the UI.
    if (!user.isPro) {
      const draftCount = await prisma.draft.count({ where: { userId: user.id } })
      if (draftCount >= FREE_DRAFT_LIMIT) {
        return res.status(403).json({
          error: `The free plan includes up to ${FREE_DRAFT_LIMIT} drafts. Upgrade to Pro for unlimited drafts.`,
          code: 'DRAFT_LIMIT',
          limit: FREE_DRAFT_LIMIT,
        })
      }
    }

    const { title, content, topic, deadline } = req.body
    const draft = await prisma.draft.create({
      data: {
        title: title || 'Untitled Draft',
        content: content || { type: 'doc', content: [] },
        topic,
        deadline,
        userId: user.id,
      },
    })
    res.json(draft)
  } catch (error) {
    handleError(res, error)
  }
})

app.get('/api/drafts/:id', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    res.json(draft)
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/drafts/:id/content', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { content, lastKnownUpdatedAt } = req.body
    const existingDraft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true, updatedAt: true },
    })

    if (!existingDraft) return res.status(404).json({ error: 'Draft not found' })

    if (
      typeof lastKnownUpdatedAt === 'string' &&
      new Date(lastKnownUpdatedAt).getTime() !== existingDraft.updatedAt.getTime()
    ) {
      return res.status(409).json({
        error: 'Draft changed elsewhere',
        updatedAt: existingDraft.updatedAt,
      })
    }

    const [draft, version] = await prisma.$transaction([
      prisma.draft.update({
        where: { id: existingDraft.id },
        data: { content, updatedAt: new Date() },
      }),
      prisma.version.create({
        data: { draftId: existingDraft.id, content },
      }),
    ])

    // Prune history — keep only the 50 most recent versions
    const versionCount = await prisma.version.count({ where: { draftId: existingDraft.id } })
    if (versionCount > 50) {
      const toDelete = await prisma.version.findMany({
        where: { draftId: existingDraft.id },
        orderBy: { createdAt: 'asc' },
        take: versionCount - 50,
        select: { id: true },
      })
      await prisma.version.deleteMany({
        where: { id: { in: toDelete.map((v) => v.id) } },
      })
    }

    res.json({ draft, version })
  } catch (error) {
    handleError(res, error)
  }
})

app.get('/api/drafts/:id/versions', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    const versions = await prisma.version.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })
    res.json(versions)
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/drafts/:id/restore/:versionId', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draftForUser = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true },
    })
    if (!draftForUser) return res.status(404).json({ error: 'Draft not found' })

    const version = await prisma.version.findFirst({
      where: { id: req.params.versionId, draftId: draftForUser.id },
    })
    if (!version) return res.status(404).json({ error: 'Version not found' })

    const draft = await prisma.draft.update({
      where: { id: draftForUser.id },
      data: {
        content: version.content as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    })

    await prisma.version.create({
      data: {
        draftId: draftForUser.id,
        content: version.content as Prisma.InputJsonValue,
      },
    })

    res.json(draft)
  } catch (error) {
    handleError(res, error)
  }
})

app.delete('/api/drafts/:id', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    await prisma.draft.delete({ where: { id: draft.id } })
    res.status(204).send()
  } catch (error) {
    handleError(res, error)
  }
})

app.patch('/api/drafts/:id/starred', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const existingDraft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true },
    })
    if (!existingDraft) return res.status(404).json({ error: 'Draft not found' })

    const starred = Boolean(req.body.starred)
    const draft = await prisma.draft.update({
      where: { id: existingDraft.id },
      data: { starred },
      select: { id: true, starred: true },
    })
    res.json(draft)
  } catch (error) {
    handleError(res, error)
  }
})

app.patch('/api/drafts/:id', async (req, res) => {
  try {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const existingDraft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: user.id },
      select: { id: true },
    })
    if (!existingDraft) return res.status(404).json({ error: 'Draft not found' })

    const title = String(req.body.title || 'Untitled Draft').trim() || 'Untitled Draft'
    const draft = await prisma.draft.update({
      where: { id: existingDraft.id },
      data: { title },
    })
    res.json(draft)
  } catch (error) {
    handleError(res, error)
  }
})

// AI sentence variations: Pro plan only, per-user rate limited.
app.post('/api/rewrite', ...requirePro, aiLimiter, async (req, res) => {
  try {
    const sentence = typeof req.body?.sentence === 'string' ? req.body.sentence.trim() : ''

    if (!sentence) {
      return res.status(400).json({
        error: 'Sentence required',
      })
    }

    if (sentence.length > 2000) {
      return res.status(400).json({
        error: 'Sentence is too long',
      })
    }

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content:
            'Rewrite the sentence while preserving meaning. Return only the rewritten sentence.',
        },
        {
          role: 'user',
          content: sentence,
        },
      ],
      temperature: 0.9,
      max_completion_tokens: 500,
    })

    const variation =
      completion.choices[0]?.message?.content?.trim() ?? sentence

    res.json({
      variation,
    })
  } catch (error) {
    handleError(res, error)
  }
})

// ── Start server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

export default app
