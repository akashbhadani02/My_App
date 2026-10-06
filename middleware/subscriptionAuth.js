const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth + subscription gate for student app APIs.
// Login and /api/subscription remain available before payment confirmation.
module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No Token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
            .select('sessionVersion activeSessionId isDeleted subscriptionStatus subscriptionAccess');

        if (!user || user.isDeleted) {
            return res.status(401).json({ success: false, message: 'Account is not available', forceLogout: true });
        }

        if (Number(decoded.sessionVersion ?? 0) !== Number(user.sessionVersion || 0)) {
            return res.status(401).json({
                success: false,
                message: 'Session ended by admin. Please login again.',
                forceLogout: true
            });
        }

        if (!decoded.activeSessionId || decoded.activeSessionId !== String(user.activeSessionId || '')) {
            return res.status(401).json({
                success: false,
                message: 'You logged in on another device. This device has been logged out.',
                forceLogout: true
            });
        }

        if (user.subscriptionStatus !== 'active' || user.subscriptionAccess !== true) {
            return res.status(403).json({
                success: false,
                subscriptionRequired: true,
                subscriptionStatus: user.subscriptionStatus || 'inactive',
                message: '₹200 subscription payment is required. Please complete payment and wait for admin confirmation.'
            });
        }

        req.user = decoded;
        req.subscriptionUser = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid Token' });
    }
};
