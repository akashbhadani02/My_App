# Aducate.app — AI English Coach update

This ZIP is based on the project you provided and adds a text-based AI English Coach.

## Added
- `public/ai-coach.html` — student-facing coach page.
- `routes/aiCoach.js` — authenticated server-side endpoint that calls OpenAI Responses API.
- `server.js` registers `/api/ai-coach`.
- A floating **AI English Coach** shortcut on `public/login.html` and `public/earn.html`.

## Deploy
1. Upload/commit these updated files to the same GitHub repository connected to Vercel.
2. In Vercel → Project → Settings → Environment Variables, add `OPENAI_API_KEY` with your secret key for Production.
3. Optionally add `OPENAI_MODEL` (default `gpt-4.1-mini`).
4. Redeploy and wait for `Ready`.
5. Sign in to the app, then open `/ai-coach.html` or click the floating AI English Coach button.

## Notes
- Keep `.env`, API keys, `.git`, and `node_modules` out of the ZIP/repository.
- The AI Coach requires a valid logged-in student token and the existing MongoDB/auth setup.
- OpenAI API usage can cost money. Check API billing and usage limits.
- The coach evaluates text only; it does not assess audio pronunciation.
