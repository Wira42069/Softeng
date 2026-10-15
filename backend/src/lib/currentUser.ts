import type { Request } from 'express'
import { auth } from './auth.js'
import { prisma } from './prisma.js'
import { isAdminEmail, isPro } from './plans.js'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  nickname: string | null
  image: string | null
  plan: string
  role: string
  isPro: boolean
  isAdmin: boolean
  stripeCustomerId: string | null
}

// Resolves the Better-Auth session, then loads plan/role from our own table
// (Better-Auth's session object does not carry our custom columns).
export async function getCurrentUser(req: Request): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  })
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      image: true,
      plan: true,
      role: true,
      stripeCustomerId: true,
    },
  })
  if (!user) return null

  return {
    ...user,
    isPro: isPro(user.plan),
    isAdmin: user.role === 'admin' || isAdminEmail(user.email),
  }
}
