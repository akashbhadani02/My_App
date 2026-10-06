const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const router = express.Router();

const auth = require("../middleware/subscriptionAuth");
const User = require("../models/User");

// Same encryption format used by signup/admin credential management.
// This keeps the latest student-chosen password available to authorized admin users.
const CREDENTIAL_ALGO = "aes-256-gcm";
const CREDENTIAL_KEY = crypto.createHash("sha256")
    .update(String(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || "change-this-secret"))
    .digest();

function decryptStudentPassword(payload) {
    if (!payload || typeof payload !== "string") return null;
    try {
        const [ivB64, tagB64, dataB64] = payload.split(".");
        if (!ivB64 || !tagB64 || !dataB64) return null;
        const decipher = crypto.createDecipheriv(CREDENTIAL_ALGO, CREDENTIAL_KEY, Buffer.from(ivB64, "base64url"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
        return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

function encryptStudentPassword(password) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CREDENTIAL_ALGO, CREDENTIAL_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

router.get("/", auth, async (req, res) => {

    try {

        const user = await User.findById(req.user.id).select("-password");

        res.json({

            success: true,

            user

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});


// =========================
// CHANGE STUDENT PASSWORD
// =========================
router.put("/password", auth, async (req, res) => {
    try {
        const currentPassword = String(req.body?.currentPassword || "");
        const newPassword = String(req.body?.newPassword || "");

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current password and new password are required." });
        }
        if (newPassword.length < 4) {
            return res.status(400).json({ success: false, message: "New password must be at least 4 characters." });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const storedPlain = user.passwordEncrypted ? decryptStudentPassword(user.passwordEncrypted) : null;
        const valid = storedPlain !== null
            ? currentPassword === storedPlain
            : await bcrypt.compare(currentPassword, user.password);

        if (!valid) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordEncrypted = encryptStudentPassword(newPassword);
        await user.save();

        return res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
        console.error("Password change error:", err);
        return res.status(500).json({ success: false, message: "Unable to change password. Please try again." });
    }
});

module.exports = router;