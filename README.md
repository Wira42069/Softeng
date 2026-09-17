This is a guide for running Flowdraft locally.

First go to backend .env and set the DATABASE_URL and DIRECT_URL to have the database password, and then the GROQ_API_KEY to have the groq api key. Both of those passwords are secret and should *never* be uploaded or pushed online, they should already be inside your machine locally. If not, ask Wira for them.

Then go to frontend .env and you'll see VITE_API_BASE_URL. That's set to the deployment server, but we're running locally. I'm too lazy to automate it so fix it manually by changing it to
VITE_API_BASE_URL="http://localhost:3000"
just comment out the old env variable.

Then go to backend/src/index.ts , and search for this
// ── Start server ───────────────────────────────────────────────────────────
below it there's a commented app.listen command. Uncomment it

Now open 2 terminals. In the first terminal go to Softeng-main\backend, type npx prisma generate, then type npm install, then type npm run dev. In the 2nd terminal go to the frontend and type npm install and then npm run dev.