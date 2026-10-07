const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const SUBSCRIPTION_PRICE = 200;

function statusPayload(user, request = null) {
    return {
        success: true,
        subscription: {
            status: user?.subscriptionStatus || 'inactive',
            access: user?.subscriptionAccess === true,
            amount: SUBSCRIPTION_PRICE,
            paymentReference: user?.subscriptionPaymentReference || request?.paymentReference || '',
            paymentScreenshot: request?.paymentScreenshot || '',
            requestedAt: user?.subscriptionRequestedAt || request?.submittedAt || null,
            confirmedAt: user?.subscriptionConfirmedAt || request?.confirmedAt || null,
            adminNote: user?.subscriptionAdminNote || request?.adminNote || '',
            demo: { active: user?.demoAccess === true && user?.demoExpiresAt && new Date(user.demoExpiresAt).getTime() > Date.now(), startedAt: user?.demoStartedAt || null, expiresAt: user?.demoExpiresAt || null }
        }
    };
}

// Student: subscription status, available even before payment.
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            'subscriptionStatus subscriptionAccess subscriptionAmount subscriptionPaymentReference subscriptionRequestedAt subscriptionConfirmedAt subscriptionAdminNote demoAccess demoStartedAt demoExpiresAt'
        ).lean();
        if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
        const request = await Subscription.findOne({ userId: user._id }).sort({ submittedAt: -1 }).lean();
        res.set('Cache-Control', 'no-store');
        return res.json(statusPayload(user, request));
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Student: unlock app access with the owner-provided access PIN.
// The PIN is kept server-side and can be overridden with ACCESS_PIN in production.
router.post('/pin-access', auth, async (req, res) => {
    try {
        const enteredPin = String(req.body?.pin || '').trim();
        const accessPin = String(process.env.ACCESS_PIN || '1316618').trim();

        if (!enteredPin || enteredPin !== accessPin) {
            return res.status(403).json({ success: false, message: 'Invalid access PIN.' });
        }

        const user = await User.findById(req.user.id);
        if (!user || user.isDeleted) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const now = new Date();
        user.subscriptionStatus = 'active';
        user.subscriptionAccess = true;
        user.subscriptionAmount = SUBSCRIPTION_PRICE;
        user.subscriptionConfirmedAt = now;
        user.subscriptionAdminNote = 'Access granted using owner access PIN.';
        user.isBlocked = false;
        user.permanentBlocked = false;
        user.blockUntil = null;
        user.blockReason = '';
        user.warningCount = 0;
        user.blockCount = 0;
        user.blockAt = null;
        user.isOnline = false;
        await user.save();

        return res.json({
            success: true,
            access: true,
            status: 'active',
            message: 'Access PIN accepted. App access is now active.'
        });
    } catch (err) {
        console.error('Subscription PIN access error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Student: submit UTR/payment reference after paying ₹200 to the supplied QR.
router.post('/request', auth, async (req, res) => {
    try {
        const paymentReference = String(req.body?.paymentReference || '').trim().slice(0, 100);
        const paymentScreenshot = String(req.body?.paymentScreenshot || '').trim();
        const paymentScreenshotName = String(req.body?.paymentScreenshotName || '').trim().slice(0, 120);
        if (!paymentScreenshot || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(paymentScreenshot)) {
            return res.status(400).json({ success: false, message: 'Please upload your payment screenshot.' });
        }
        if (paymentScreenshot.length > 2500000) {
            return res.status(400).json({ success: false, message: 'Screenshot is too large. Please upload a smaller image.' });
        }
        if (paymentReference.length < 3) {
            return res.status(400).json({ success: false, message: 'Please enter your UTR / payment reference.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Student not found' });

        if (user.subscriptionStatus === 'active' && user.subscriptionAccess === true) {
            return res.json({ success: true, alreadyActive: true, message: 'Your subscription is already active.' });
        }

        const existingPending = await Subscription.findOne({ userId: user._id, status: 'pending' }).sort({ submittedAt: -1 });
        if (existingPending) {
            existingPending.paymentReference = paymentReference;
            existingPending.paymentScreenshot = paymentScreenshot;
            existingPending.paymentScreenshotName = paymentScreenshotName;
            existingPending.amount = SUBSCRIPTION_PRICE;
            existingPending.studentName = user.name || '';
            existingPending.studentMobile = user.mobile || '';
            existingPending.submittedAt = new Date();
            existingPending.adminNote = '';
            await existingPending.save();
        } else {
            await Subscription.create({
                userId: user._id,
                studentName: user.name || '',
                studentMobile: user.mobile || '',
                amount: SUBSCRIPTION_PRICE,
                paymentReference,
                paymentScreenshot,
                paymentScreenshotName,
                status: 'pending',
                submittedAt: new Date()
            });
        }

        user.subscriptionStatus = 'pending';
        user.subscriptionAccess = false;
        user.subscriptionAmount = SUBSCRIPTION_PRICE;
        user.subscriptionPaymentReference = paymentReference;
        user.subscriptionRequestedAt = new Date();
        user.subscriptionConfirmedAt = null;
        user.subscriptionConfirmedBy = null;
        user.subscriptionAdminNote = '';
        await user.save();

        return res.json({ success: true, status: 'pending', message: 'Payment submitted. Admin will verify it and activate your app access.' });
    } catch (err) {
        console.error('Subscription request error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: all payment requests.
router.get('/admin/requests', adminAuth, async (req, res) => {
    try {
        const requests = await Subscription.find({})
            .populate('userId', 'name mobile isDeleted subscriptionStatus subscriptionAccess')
            .sort({ submittedAt: -1 })
            .lean();
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, requests });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: confirm ₹200 payment and grant app access.
router.put('/admin/:id/confirm', adminAuth, async (req, res) => {
    try {
        const request = await Subscription.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Subscription request not found.' });
        const user = await User.findById(request.userId);
        if (!user || user.isDeleted) return res.status(404).json({ success: false, message: 'Student not found.' });

        const note = String(req.body?.adminNote || 'Payment verified by admin.').trim().slice(0, 300);
        const now = new Date();

        request.status = 'confirmed';
        request.amount = SUBSCRIPTION_PRICE;
        request.confirmedAt = now;
        request.confirmedBy = req.admin.id;
        request.adminNote = note;
        await request.save();

        user.subscriptionStatus = 'active';
        user.subscriptionAccess = true;
        user.subscriptionAmount = SUBSCRIPTION_PRICE;
        user.subscriptionPaymentReference = request.paymentReference || user.subscriptionPaymentReference || '';
        user.subscriptionConfirmedAt = now;
        user.subscriptionConfirmedBy = req.admin.id;
        user.subscriptionAdminNote = note;

        // A permanent block becomes a paid reactivation gate: before the ₹200
        // payment is confirmed the student has no app access. Once Admin
        // verifies the new ₹200 payment, clear the permanent block so the
        // student can use the app again. Previous subscription requests are
        // retained in Admin history and can be explicitly deleted by Admin.
        if (user.permanentBlocked === true || user.isBlocked === true) {
            user.isBlocked = false;
            user.permanentBlocked = false;
            user.blockUntil = null;
            user.blockReason = '';
            user.warningCount = 0;
            user.blockCount = 0;
            user.sessionVersion = Number(user.sessionVersion || 0) + 1;
            user.isOnline = false;
        }

        await user.save();

        // If multiple old pending requests exist for the same student, close them
        // so Admin does not accidentally approve a duplicate payment request later.
        await Subscription.updateMany(
            { userId: user._id, _id: { $ne: request._id }, status: 'pending' },
            { $set: { status: 'rejected', adminNote: 'Closed after another payment request was confirmed.' } }
        );

        return res.json({ success: true, message: 'Payment confirmed. Student app access is now active.' });
    } catch (err) {
        console.error('Subscription confirm error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: reject a payment request.
router.put('/admin/:id/reject', adminAuth, async (req, res) => {
    try {
        const request = await Subscription.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Subscription request not found.' });
        const user = await User.findById(request.userId);
        const note = String(req.body?.adminNote || 'Payment could not be verified.').trim().slice(0, 300);
        request.status = 'rejected';
        request.confirmedAt = null;
        request.confirmedBy = req.admin.id;
        request.adminNote = note;
        await request.save();
        if (user) {
            user.subscriptionStatus = 'rejected';
            user.subscriptionAccess = false;
            user.subscriptionAdminNote = note;
            await user.save();
        }
        return res.json({ success: true, message: 'Payment request rejected.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: permanently delete a subscription request that is not being granted access.
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const request = await Subscription.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Subscription request not found.' });

        const user = await User.findById(request.userId);

        // Admin can delete ANY subscription request, including confirmed/active ones.
        // If the deleted request was the student's active subscription, remove the
        // student's app access automatically so there is no need for a separate
        // "Remove Access" step.
        await Subscription.deleteOne({ _id: request._id });

        if (user) {
            const remainingConfirmed = await Subscription.exists({
                userId: user._id,
                status: 'confirmed'
            });

            if (!remainingConfirmed) {
                user.subscriptionStatus = 'inactive';
                user.subscriptionAccess = false;
                user.subscriptionPaymentReference = '';
                user.subscriptionRequestedAt = null;
                user.subscriptionConfirmedAt = null;
                user.subscriptionConfirmedBy = null;
                user.subscriptionAdminNote = 'Subscription request deleted by admin.';
                await user.save();
            }
        }

        return res.json({ success: true, message: 'Subscription request deleted successfully.' });
    } catch (err) {
        console.error('Subscription delete error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: revoke access without deleting payment history.
router.put('/admin/user/:userId/access', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Student not found.' });
        const access = req.body?.access === true;
        user.subscriptionAccess = access;
        user.subscriptionStatus = access ? 'active' : 'inactive';
        user.subscriptionAdminNote = access ? 'App access granted by admin.' : 'App access removed by admin.';
        if (access) {
            user.subscriptionConfirmedAt = new Date();
        } else {
            // Revoke existing sessions immediately. The student must log in again
            // before they can use the PIN to request access again.
            user.sessionVersion = Number(user.sessionVersion || 0) + 1;
            user.isOnline = false;
        }
        await user.save();
        return res.json({ success: true, access, message: access ? 'Student app access granted.' : 'Student app access removed.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
