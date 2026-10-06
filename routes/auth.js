const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const auth = require("../middleware/auth");

const User = require("../models/User");
const Admin = require("../models/Admin");

const router = express.Router();

// Reversible encryption is used only for the optional admin credential-view feature.
// The encrypted value is never sent to students and is decrypted only after adminAuth.
const CREDENTIAL_ALGO = "aes-256-gcm";
const CREDENTIAL_KEY = crypto.createHash("sha256")
    .update(String(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || "change-this-secret"))
    .digest();

function encryptStudentPassword(password) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CREDENTIAL_ALGO, CREDENTIAL_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

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


// ==========================
// Signup
// ==========================

router.post("/signup", async (req, res) => {

    try {

        const { name, mobile, password } = req.body;

        const user = await User.findOne({ mobile });

        if (user) {
            return res.status(400).json({
                success: false,
                message: "Mobile already registered"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            mobile,
            password: hash,
            passwordEncrypted: encryptStudentPassword(password)
        });

        await newUser.save();

        res.json({
            success: true,
            message: "Signup Successful"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});



// ==========================
// Login
// ==========================


router.post("/login", async (req, res) => {

    try {

        const { mobile, password } = req.body;

        const user = await User.findOne({ mobile, isDeleted: { $ne: true } });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });

        }

        // Admin-wide login lock: after "Logout All Users", students remain
        // unable to login until the admin explicitly enables users again.
        const loginLock = await Admin.findOne({ userLoginLocked: true }).select("_id").lean();
        if (loginLock) {
            return res.status(403).json({
                success: false,
                loginLocked: true,
                message: "Student login is temporarily disabled by admin. Please try again later."
            });
        }

        let match = false;
        const storedPlainPassword = decryptStudentPassword(user.passwordEncrypted);
        if (storedPlainPassword !== null) {
            match = String(password) === storedPlainPassword;
        } else {
            match = await bcrypt.compare(password, user.password);
        }

        if (!match) {

            return res.status(401).json({
                success: false,
                message: "Wrong Password"
            });

        }

        // Automatic cheating blocks have been removed.
        // Existing legacy block fields no longer prevent login or app access.

        // Security audit: record every successful login and unique device.
        // Only ONE active session is allowed for a student. A new login creates
        // a new session id, which immediately invalidates the previous device.
        const clientDeviceId = String(req.headers["x-device-id"] || "").trim().slice(0, 200);
        const activeSessionId = crypto.randomUUID();
        user.deviceIds = Array.isArray(user.deviceIds) ? user.deviceIds : [];
        if (clientDeviceId && !user.deviceIds.includes(clientDeviceId)) {
            user.deviceIds.push(clientDeviceId);
            if (user.deviceIds.length > 50) user.deviceIds = user.deviceIds.slice(-50);
        }
        user.deviceCount = Math.max(Number(user.deviceCount || 0), user.deviceIds.length);

        user.loginHistory = Array.isArray(user.loginHistory) ? user.loginHistory : [];
        user.loginHistory.push({
            time: new Date(),
            ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim(),
            userAgent: String(req.headers["user-agent"] || "")
        });
        // Keep the latest 100 login records per student.
        if (user.loginHistory.length > 100) {
            user.loginHistory = user.loginHistory.slice(-100);
        }

        // Replace the previous login completely. This makes the old device
        // fail its next authenticated request/heartbeat and log out.
        user.activeSessionId = activeSessionId;
        user.activeDeviceId = clientDeviceId;

        // Push notifications belong ONLY to the latest logged-in device.
        // The new device will save its subscription immediately after login.
        user.pushSubscriptions = [];

        // Student ને Online કરો
        user.isOnline = true;
        user.lastSeen = new Date();

        await user.save();

        const token = jwt.sign(

            {
                id: user._id,
                sessionVersion: Number(user.sessionVersion || 0),
                activeSessionId
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );

        res.json({

            success: true,

            token,

            user

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});

// ==========================
// Student Presence / Heartbeat
// ==========================

const verifyPresenceToken = async (req) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];
    if (!token) throw new Error("No token provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("sessionVersion activeSessionId isDeleted isBlocked");
    if (!user || user.isDeleted || user.isBlocked) throw new Error("Account is not available");

    if (Number(decoded.sessionVersion ?? 0) !== Number(user.sessionVersion || 0)) {
        const e = new Error("Session ended by admin. Please login again.");
        e.forceLogout = true;
        throw e;
    }

    if (!decoded.activeSessionId || decoded.activeSessionId !== String(user.activeSessionId || "")) {
        const e = new Error("You logged in on another device. This device has been logged out.");
        e.forceLogout = true;
        throw e;
    }
    return decoded;
};

router.post("/heartbeat", async (req, res) => {
    try {
        const decoded = await verifyPresenceToken(req);

        const presenceId = String(req.headers["x-presence-id"] || "").trim();
        if (!presenceId) {
            return res.status(400).json({ success: false, message: "Presence id missing" });
        }

        // Heartbeat is the ONLY thing that refreshes presence. The presence id
        // belongs to this browser tab, so multiple tabs cannot race each other.
        await User.findOneAndUpdate(
            { _id: decoded.id },
            { $set: { isOnline: true, lastSeen: new Date(), presenceId } },
            { new: false }
        );

        res.json({ success: true });
    } catch (err) {
        const status = err.forceLogout ? 401 : (err.message === "No token provided" ? 401 : 401);
        res.status(status).json({
            success: false,
            message: err.message || "Invalid token",
            forceLogout: !!err.forceLogout
        });
    }
});

// Called when the student tab becomes hidden / is closed.
router.post("/offline", async (req, res) => {
    try {
        const decoded = await verifyPresenceToken(req);

        const presenceId = String(req.headers["x-presence-id"] || "").trim();
        if (!presenceId) return res.status(400).json({ success: false });

        // Only this exact tab may turn its presence offline. If another tab
        // became the active tab after this one was hidden, this update matches
        // nothing and therefore cannot cause Online -> Offline flicker.
        await User.findOneAndUpdate(
            { _id: decoded.id, presenceId },
            { $set: { isOnline: false } },
            { new: false }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(401).json({ success: false });
    }
});

// ==========================
// Student cheating block system removed.
// Legacy block fields remain in MongoDB for compatibility/admin history.
// ==========================

// ==========================
// Security Event Tracking
// Tracks tab changes, fast answers and unique devices.
// ==========================
router.post("/security-event", auth, async (req, res) => {
    try {
        const { type, deviceId } = req.body || {};
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (type === "tab_change") {
            user.tabChanges = Number(user.tabChanges || 0) + 1;
        } else if (type === "fast_answer") {
            user.fastAnswers = Number(user.fastAnswers || 0) + 1;
        } else if (type === "paste_attempt") {
            user.pasteAttempts = Number(user.pasteAttempts || 0) + 1;
        } else if (type === "suspicious_timing") {
            user.suspiciousTimingEvents = Number(user.suspiciousTimingEvents || 0) + 1;
        } else if (type === "window_blur") {
            user.tabChanges = Number(user.tabChanges || 0) + 1;
        } else if (type === "device") {
            const id = String(deviceId || "").trim().slice(0, 200);
            if (!id) return res.status(400).json({ success: false, message: "Device ID required" });
            user.deviceIds = Array.isArray(user.deviceIds) ? user.deviceIds : [];
            if (!user.deviceIds.includes(id)) {
                user.deviceIds.push(id);
                if (user.deviceIds.length > 50) user.deviceIds = user.deviceIds.slice(-50);
            }
            user.deviceCount = user.deviceIds.length;
        } else {
            return res.status(400).json({ success: false, message: "Unknown security event" });
        }

        await user.save();
        return res.json({
            success: true,
            fastAnswers: Number(user.fastAnswers || 0),
            tabChanges: Number(user.tabChanges || 0),
            pasteAttempts: Number(user.pasteAttempts || 0),
            suspiciousTimingEvents: Number(user.suspiciousTimingEvents || 0),
            deviceCount: Number(user.deviceCount || 0),
            warningCount: Number(user.warningCount || 0),
            loginCount: Array.isArray(user.loginHistory) ? user.loginHistory.length : 0
        });
    } catch (err) {
        console.error("Security event error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;