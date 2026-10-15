# FlowDraft

A guided writing workspace: pick a topic, draft in a focused editor, edit by structure, add citations and export to DOCX or PDF.

- **Free plan:** up to 5 drafts, ad-supported, no AI.
- **Pro plan:** AI sentence variations (Groq), unlimited drafts, no ads.

These rules are enforced on the server (`backend/src/lib/plans.ts`, `backend/src/index.ts`), not only in the UI.

## Run locally

Secrets are never committed. Ask Wira for the real values.

1. **Backend env.** Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, `DIRECT_URL` and `GROQ_API_KEY`.
   Use a separate development database, not the shared one, because migrations change the schema.
2. **Frontend env.** Copy `frontend/.env.example` to `frontend/.env`. Leave `VITE_API_BASE_URL` empty: Vite proxies `/api` to `localhost:3000`.
3. **Backend** (terminal 1):
   ```
   cd backend
   npm install
   npx prisma migrate dev     # applies all migrations to your dev database
   npm run dev
   ```
4. **Frontend** (terminal 2):
   ```
   cd frontend
   npm install
   npm run dev
   ```
5. Open http://localhost:5173, sign up, and start writing.

## Try the plans locally (no Stripe needed)

1. Set `ALLOW_DEV_UPGRADE=true` in `backend/.env` and restart the backend.
2. As a new user you are on Free: create 5 drafts and the 6th is blocked, and "AI Variations" shows a lock.
3. Click **Upgrade** (Dashboard or Projects page). With Stripe unconfigured, dev builds switch you to Pro directly.
4. To go back to Free, run in the browser console on the app: `fetch('/api/billing/dev-upgrade',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:'free'})})`.

`dev-upgrade` is disabled whenever `NODE_ENV=production`.

## Real payments (Stripe)

1. In Stripe, create a product with a recurring monthly price. Put its id in `STRIPE_PRICE_ID` and your secret key in `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint `https://<your-backend>/api/billing/webhook` for the events
   `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   For local testing: `stripe listen --forward-to localhost:3000/api/billing/webhook`.
3. Set `VITE_PRO_PRICE` (frontend) to the price you charge, so the Pricing page matches.
4. Use Stripe test mode and test card `4242 4242 4242 4242` first.

## Admin and feedback

Users can send feedback from the Dashboard or Projects page. Set `ADMIN_EMAILS` in `backend/.env` to a comma-separated list of emails; those users see an **Admin** link and can read and delete feedback at `/admin`.

## Citations

Open **Sources** (book icon) in the editor to add sources by DOI (looked up on Crossref) or manually. Insert an in-text citation at the cursor, pick APA or MLA, and the reference list is added to the Preview, DOCX and PDF exports.

## Deploying

Both apps deploy to Vercel (see each `vercel.json`). Before the first deploy of this version, apply the database migration to every real database:

```
cd backend
npx prisma migrate deploy
```

In production the backend requires `BETTER_AUTH_SECRET` and `FRONTEND_URL`.

## Project layout

- `backend/` Express 5, Prisma (Postgres), Better-Auth, Groq, Stripe
  - `src/lib/` plans, guards (login / Pro / admin), rate limits, Stripe client
  - `src/routes/` billing, citations, feedback and admin
- `frontend/` React 19, Vite, TipTap
  - `src/pages/` Landing, Pricing, Login, ProjectsHome, NewDraft, Dashboard, Admin
  - `src/lib/` plan hook (`me.ts`), billing, citation formatting
