import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { auth } from './lib/auth'
import { prisma } from './lib/prisma'
import { Prisma } from '@prisma/client'
import { toNodeHandler } from 'better-auth/node'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())

// Better Auth routes (sign up, sign in, etc)
app.use('/api/auth', toNodeHandler(auth))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get current user
app.get('/api/me', async (req, res) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string,string>),
  })
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  res.json(session.user)
})

// ===== DRAFT ROUTES =====

// Get all drafts for current user
app.get('/api/drafts', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const drafts = await prisma.draft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
    },
  })
  
  res.json(drafts)
})

// Create new draft
app.post('/api/drafts', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const draft = await prisma.draft.create({
    data: {
      title: 'Untitled Draft',
      content: { type: 'doc', content: [] },
      userId: session.user.id,
    },
  })
  
  res.json(draft)
})

// Get single draft with its latest version
app.get('/api/drafts/:id', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const draft = await prisma.draft.findFirst({
    where: {
      id: req.params.id,
      userId: session.user.id,
    },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  
  if (!draft) {
    return res.status(404).json({ error: 'Draft not found' })
  }
  
  res.json(draft)
})

// Auto-save content (creates a new version)
app.put('/api/drafts/:id/content', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const { content } = req.body
  
  // Update draft and create version in a transaction
  const [draft, version] = await prisma.$transaction([
    prisma.draft.update({
      where: { id: req.params.id },
      data: {
        content,
        updatedAt: new Date(),
      },
    }),
    prisma.version.create({
      data: {
        draftId: req.params.id,
        content,
      },
    }),
  ])
  
  // Keep only last 50 versions
  const versionCount = await prisma.version.count({
    where: { draftId: req.params.id },
  })
  
  if (versionCount > 50) {
    const toDelete = await prisma.version.findMany({
      where: { draftId: req.params.id },
      orderBy: { createdAt: 'asc' },
      skip: 50,
      take: versionCount - 50,
      select: { id: true },
    })
    
    await prisma.version.deleteMany({
      where: { id: { in: toDelete.map(v => v.id) } },
    })
  }
  
  res.json({ draft, version })
})

// Get version history
app.get('/api/drafts/:id/versions', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const versions = await prisma.version.findMany({
    where: { draftId: req.params.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
    },
  })
  
  res.json(versions)
})

// Restore a previous version
app.post('/api/drafts/:id/restore/:versionId', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const version = await prisma.version.findFirst({
    where: {
      id: req.params.versionId,
      draftId: req.params.id,
    },
  })
  
  if (!version) {
    return res.status(404).json({ error: 'Version not found' })
  }
  
  const draft = await prisma.draft.update({
    where: { id: req.params.id },
    data: {
      content: version.content as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  })
  
  // Also create a new version for this restore
  await prisma.version.create({
    data: {
      draftId: req.params.id,
      content: version.content as Prisma.InputJsonValue,
    },
  })
  
  res.json(draft)
})

// Delete draft
app.delete('/api/drafts/:id', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  await prisma.draft.delete({
    where: {
      id: req.params.id,
      userId: session.user.id,
    },
  })
  
  res.status(204).send()
})

// Rename draft
app.patch('/api/drafts/:id', async (req, res) => {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string,string>) })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const { title } = req.body
  
  const draft = await prisma.draft.update({
    where: {
      id: req.params.id,
      userId: session.user.id,
    },
    data: { title },
  })
  
  res.json(draft)
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`)
})