// Business rules from the FlowDraft Business Model Canvas.
//   Free tier: basic services, ads, no AI, max 5 essays (drafts).
//   Pro tier:  AI refining, no ads, unlimited essays.

export const FREE_DRAFT_LIMIT = 5

export type Plan = 'free' | 'pro'

export function isPro(plan?: string | null): boolean {
  return plan === 'pro'
}

// Comma-separated list in ADMIN_EMAILS grants admin access without a DB edit.
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}
