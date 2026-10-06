const express = require("express");
const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/auth");
const { getPublicKey } = require("../services/webPush");

// Student gets the public VAPID key.
router.get("/vapid-public-key", auth, (req, res) => {
    try {
        return res.json({
            success: true,
            publicKey: getPublicKey()
        });
    } catch (err) {
        console.error("VAPID public key error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// Save or update one device subscription.
// Multiple devices are supported for the same student.
router.post("/subscribe", auth, async (req, res) => {
    try {
        const subscription = req.body || {};

        if (
            !subscription.endpoint ||
            !subscription.keys?.p256dh ||
            !subscription.keys?.auth
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid push subscription"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const cleanSubscription = {
            endpoint: String(subscription.endpoint),
            expirationTime: subscription.expirationTime
                ? new Date(subscription.expirationTime)
                : null,
            keys: {
                p256dh: String(subscription.keys.p256dh),
                auth: String(subscription.keys.auth)
            }
        };

        // Only the latest logged-in device receives student notifications.
        // Login clears the previous subscription; saving here replaces any
        // leftover/older subscription with this device's current subscription.
        user.pushSubscriptions = [cleanSubscription];
        await user.save();

        return res.json({
            success: true,
            message: "Notifications enabled on this device",
            deviceCount: Number(user.deviceCount || 0)
        });
    } catch (err) {
        console.error("Push subscribe error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;
