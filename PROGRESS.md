# FlowDraft monetization work: resume checklist

Branch: `monetization` (based on `VCmain`). Goal: make the repo match the Business Model Canvas.
Rules: free = 5 drafts, ads, no AI. Pro = AI refining, no ads, unlimited drafts.

**To resume** (in Claude, Codex or by hand): read this file, find the first unchecked item,
do it, tick it, commit. Each item is one commit. `git log --oneline` shows what is done.

## Backend (all server-side rules live here)
- [x] B1. `/api/rewrite` requires login + Pro + per-user rate limit; Groq response log removed
- [x] B2. `User.plan`, `User.role`, Stripe ids, `Draft.sources`, `Feedback` table + migration `20261014000000_monetization`
- [x] B3. 5-draft limit on `POST /api/drafts` (403, code `DRAFT_LIMIT`); `/api/me` returns plan, role, draftCount, draftLimit
- [x] B4. Billing: `POST /api/billing/checkout`, `/portal`, `/webhook` (raw body), `/dev-upgrade` (local only)
- [x] B5. Citations API: `PUT /api/drafts/:id/sources`, `GET /api/citations/doi` (Crossref)
- [x] B6. Feedback API + admin API (`/api/feedback`, `/api/admin/feedback`)
- [x] B7. Cleanup: removed dead `routes/auth.ts` stub; helmet on; prod refuses to start without `BETTER_AUTH_SECRET`
- [x] B8. Backend type-check: only errors left are missing generated Prisma types (sandbox could not download the engine). On your machine run `cd backend && npx prisma generate && npx tsc --noEmit` to confirm it is clean

## Frontend
- [ ] F1. `lib/me.ts`: shared helper that loads `/api/me` (plan, limits)
- [ ] F2. Fix `makeSentenceVariations` (hardcoded localhost URL, no credentials); handle 403 `PRO_REQUIRED`
- [ ] F3. Locked AI button + upgrade prompt for free users (Sidebar, Dashboard)
- [ ] F4. Draft-limit handling in `NewDraft.tsx` and `ProjectsHome.tsx` (show "x of 5 drafts", upgrade prompt)
- [ ] F5. `AdSlot` component, shown only on free plan
- [ ] F6. `/pricing` page + upgrade button (Stripe checkout, dev-upgrade fallback)
- [ ] F7. Citations: `lib/citations.ts`, sources panel, insert in-text citation, reference list in preview/DOCX/PDF
- [ ] F8. Feedback dialog + `/admin` page
- [ ] F9. Landing page at `/` (free vs Pro), routes in `main.tsx`
- [ ] F10. Frontend type-check passes (`cd frontend && npx tsc -b`)

## Docs
- [ ] D1. README: new env vars, Stripe setup, how to make an admin, how to test locally
- [ ] D2. `backend/.env.example` and `frontend/.env.example`

## Env vars added
Backend: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAILS`,
`CROSSREF_MAILTO` (optional), `ALLOW_DEV_UPGRADE=true` (local testing only), `BETTER_AUTH_SECRET` (required in prod).

## After merging
Run `cd backend && npx prisma migrate deploy` against each real database. Review the migration first.
