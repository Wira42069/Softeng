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
- [x] F1. `lib/me.ts`: shared helper that loads `/api/me` (plan, limits)
- [x] F2. Fix `makeSentenceVariations` (hardcoded localhost URL, no credentials); handle 403 `PRO_REQUIRED`
- [x] F3. Locked AI button + upgrade prompt for free users (Sidebar, Dashboard)
- [x] F4. Draft-limit handling in `NewDraft.tsx` and `ProjectsHome.tsx` (show "x of 5 drafts", upgrade prompt)
- [x] F5. `AdSlot` component, shown only on free plan
- [x] F6. `/pricing` page + upgrade button (Stripe checkout, dev-upgrade fallback)
- [x] F7. Citations: `lib/citations.ts`, sources panel, insert in-text citation, reference list in preview/DOCX/PDF
- [x] F8. Feedback dialog + `/admin` page
- [x] F9. Landing page at `/` (free vs Pro), routes in `main.tsx`
- [x] F10. Frontend type-check passes (`cd frontend && npx tsc -b`) and `vite build` succeeds

## Docs
- [x] D1. README: new env vars, Stripe setup, how to make an admin, how to test locally
- [x] D2. `backend/.env.example` and `frontend/.env.example`

## Env vars added
Backend: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAILS`,
`CROSSREF_MAILTO` (optional), `ALLOW_DEV_UPGRADE=true` (local testing only), `BETTER_AUTH_SECRET` (required in prod).

## After merging
Run `cd backend && npx prisma migrate deploy` against each real database. Review the migration first.

## Verification status (what was and was not checked)
Checked: frontend `tsc -b` clean, `vite build` succeeds, ESLint clean on all new files, APA/MLA output spot-checked,
backend type-checks except for Prisma types the sandbox could not generate (see B8).
Existing lint errors NOT caused by this work: `Sidebar.tsx` and `Dashboard.tsx` setState-in-effect, `main.tsx` lazy exports.

NOT checked (needs a real database / Stripe / browser, so do this first on your machine):
1. `cd backend && npx prisma generate && npx prisma migrate dev` then `npx tsc --noEmit`
2. Free user: 6th draft is blocked (403 DRAFT_LIMIT), AI button shows lock, ad strip visible
3. Upgrade via dev-upgrade (README), then AI works, no ad, unlimited drafts
4. Citations: add source by DOI, insert at cursor, check Preview + DOCX + PDF reference list
5. Feedback sent, visible at /admin for an email in ADMIN_EMAILS
6. Stripe test-mode checkout + webhook flips plan to pro

## Ideas not done
Replace the house-ad placeholder in `AdSlot.tsx` with a real ad network; institutional licenses; AI-generated outlines.
