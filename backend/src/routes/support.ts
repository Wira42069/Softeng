import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin, requireUser, userOf } from '../lib/guards.js'
import { feedbackLimiter } from '../lib/limiters.js'

// Mounted at /api. Covers the canvas' "customer support & feedback" and "admin-client" blocks.
export const supportRouter = Router()

supportRouter.post('/feedback', requireUser, feedbackLimiter, async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) return res.status(400).json({ error: 'Please write a message.' })
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (2000 characters max).' })
    }

    const user = userOf(res)
    await prisma.feedback.create({
      data: { userId: user.id, email: user.email, message },
    })
    res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Feedback failed', error)
    res.status(500).json({ error: 'Could not send feedback. Please try again.' })
  }
})

supportRouter.get('/admin/feedback', ...requireAdmin, async (_req, res) => {
  try {
    const items = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, email: true, message: true, createdAt: true },
    })
    res.json(items)
  } catch (error) {
    console.error('Loading feedback failed', error)
    res.status(500).json({ error: 'Could not load feedback.' })
  }
})

supportRouter.delete('/admin/feedback/:id', ...requireAdmin, async (req, res) => {
  try {
    await prisma.feedback.deleteMany({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (error) {
    console.error('Deleting feedback failed', error)
    res.status(500).json({ error: 'Could not delete feedback.' })
  }
})
