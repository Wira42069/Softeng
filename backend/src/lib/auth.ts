import { betterAuth } from 'better-auth'
import { prisma } from './prisma'
import { prismaAdapter } from '@better-auth/prisma-adapter'

export const auth = betterAuth({
  database: prismaAdapter(prisma,{
    provider: 'postgresql',
}),
  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
});

console.log(auth)
console.log(auth.api)