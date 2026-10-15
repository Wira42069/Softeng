import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

// Limits are per logged-in user (falling back to IP). Mount these AFTER
// requireUser/requirePro so res.locals.user is available.
function perUser(windowMs: number, limit: number, error: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req, res) =>
      (res.locals.user?.id as string | undefined) ?? ipKeyGenerator(req.ip ?? ''),
    message: { error, code: 'RATE_LIMITED' },
  })
}

export const aiLimiter = perUser(60_000, 20, 'Too many AI requests. Please wait a minute.')
export const feedbackLimiter = perUser(10 * 60_000, 5, 'Too much feedback at once. Please try again later.')
export const lookupLimiter = perUser(60_000, 30, 'Too many lookups. Please wait a minute.')
