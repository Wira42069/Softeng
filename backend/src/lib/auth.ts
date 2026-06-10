import { betterAuth } from 'better-auth'
import { prisma } from './prisma.js'
import { prismaAdapter } from '@better-auth/prisma-adapter'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'flowdraft-local-dev-secret',

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  trustedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://localhost:4173',
    'https://flowdraftfrontend.vercel.app',
    'https://flowdraftfrontend-wira-s-projects2.vercel.app/',
  ],
})
