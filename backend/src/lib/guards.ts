import type { RequestHandler, Response } from 'express'
import { getCurrentUser, type CurrentUser } from './currentUser.js'

// Reads the user that requireUser stored for this request.
export function userOf(res: Response): CurrentUser {
  return res.locals.user as CurrentUser
}

export const requireUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.locals.user = user
    next()
  } catch (error) {
    next(error)
  }
}

const proOnly: RequestHandler = (_req, res, next) => {
  if (!userOf(res).isPro) {
    res.status(403).json({
      error: 'This feature is part of the Pro plan.',
      code: 'PRO_REQUIRED',
    })
    return
  }
  next()
}

const adminOnly: RequestHandler = (_req, res, next) => {
  if (!userOf(res).isAdmin) {
    res.status(403).json({ error: 'Admin access required.', code: 'ADMIN_REQUIRED' })
    return
  }
  next()
}

export const requirePro: RequestHandler[] = [requireUser, proOnly]
export const requireAdmin: RequestHandler[] = [requireUser, adminOnly]
