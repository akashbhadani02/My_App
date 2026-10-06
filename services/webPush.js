const webpush = require("web-push");

let configured = false;

function configureWebPush() {
    if (configured) return;

    const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
    const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
    const subject = String(process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || "").trim();

    if (!publicKey || !privateKey || !subject) {
        throw new Error(
            "Web Push is not configured. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (or VAPID_EMAIL) to Vercel Environment Variables."
        );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
}

function getPublicKey() {
    const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();

    if (!publicKey) {
        throw new Error("VAPID_PUBLIC_KEY is not configured in .env.");
    }

    return publicKey;
}

module.exports = { webpush, configureWebPush, getPublicKey };
