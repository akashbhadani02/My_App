# Aducate.app — GitHub + Vercel Deployment

## 1. GitHub
Create a new repository and upload the CONTENTS of this folder to the repository ROOT.
Do not upload a parent `Earn/` folder.

```bash
git init
git add .
git commit -m "Aducate English app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 2. Vercel
Vercel → Add New → Project → Import the GitHub repository.

Use:
- Root Directory: `./`
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: `npm install`

Then Deploy.

Vercel's Git integration automatically creates a new deployment when the connected repository is pushed.

## 3. Environment Variables
Vercel → Project → Settings → Environment Variables.
Add these to **Production** (and Preview/Development if needed):

- `MONGODB_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = long random secret
- `VAPID_EMAIL` = `mailto:your-real-email@example.com`
- `VAPID_PUBLIC_KEY` = your VAPID public key
- `VAPID_PRIVATE_KEY` = your VAPID private key
- `VAPID_SUBJECT` = `mailto:your-real-email@example.com`
- `ACCESS_PIN` = your admin/access PIN
- `CREDENTIAL_ENCRYPTION_KEY` = 32-byte encryption key used by the app

Never put real values in GitHub.
After changing environment variables, redeploy Production.

## 4. MongoDB Atlas
Allow the Vercel deployment to reach MongoDB Atlas. For a simple deployment, MongoDB Atlas Network Access can temporarily allow `0.0.0.0/0`; secure the database with a strong password and least-privilege database user.

## 5. Health check
After deployment open:

`https://YOUR-VERCEL-DOMAIN/api/health`

Expected JSON:

`{"success":true,"status":"ok","service":"english-app"}`

## 6. Custom domain: www.aducate.online
In Vercel:
Project → Settings → Domains → Add Domain → `www.aducate.online`.

Also add `aducate.online` if you want the apex domain. Vercel will show the exact DNS records for your domain/registrar; use those values rather than guessing.

Recommended final setup:
- `www.aducate.online` → Production
- `aducate.online` → redirect to `www.aducate.online`

If your DNS provider asks for a `www` record, Vercel's current dashboard supplies the project-specific CNAME target. Do not use an old/static CNAME value if Vercel displays a different target.

## 7. Google Drive book
The project has exactly one book source hard-coded in `routes/book.js`:

`1Cfw39OlkXqbbXuEu4qPQRPBtzu69rZuA`

No local PDF and no environment-variable book override are included.

Google Drive:
- General access: Anyone with the link
- Role: Viewer

The website only opens the book after the user's purchase is approved.

## 8. Important Vercel limitation
Vercel serverless functions are not a permanent WebSocket server. The app's HTTP APIs and normal login/purchase flows are deployed through Vercel. If a feature requires a persistent Socket.IO server, use a separate realtime service/server for that part.
