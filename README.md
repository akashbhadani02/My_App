# Aducate English Learning App — Fresh Vercel Build

This project is rebuilt from the existing Earn app structure with the book flow isolated to one Google Drive PDF source.

## Book source
The student reader has exactly one hard-coded Google Drive file ID: `1Cfw39OlkXqbbXuEu4qPQRPBtzu69rZuA`. There is no local PDF, no alternate book URL, and no `BOOK_DRIVE_FILE_ID` environment override.

Students can open the reader only after the existing purchase/admin approval flow grants `bookPurchase.access=true`.

## Vercel environment variables
Set these in Vercel Project Settings → Environment Variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `VAPID_EMAIL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ACCESS_PIN`
- `CREDENTIAL_ENCRYPTION_KEY`

See `.env.example`.

## Important
Google Drive must have General access = Anyone with the link, role = Viewer. Website-side controls cannot guarantee that a public Google Drive file can never be copied or screenshotted.
