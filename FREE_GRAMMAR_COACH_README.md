# Aducate - Free browser-based Grammar Coach

The page `public/ai-coach.html` now uses local JavaScript rules only. It does not call OpenAI, Gemini, LanguageTool, or any grammar API, and it does not need an API key or an extra grammar server.

## Deploy
1. Back up your current GitHub repository.
2. Replace the project files with the contents of this ZIP (keep your existing Vercel environment variables and database settings).
3. Commit and push to GitHub; Vercel should redeploy automatically.
4. Open `/ai-coach.html` and test sample sentences.

This is a small rule-based checker, not a full AI grammar engine. It catches a set of common learner errors and can miss context-dependent grammar or make imperfect suggestions. No API key or `.env` file is included in this ZIP. `node_modules` and `.git` are intentionally omitted; Vercel installs dependencies from `package.json`/`package-lock.json`.
