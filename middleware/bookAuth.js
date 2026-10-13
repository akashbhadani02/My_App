const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticates a student for book-only routes without requiring the app subscription.
// A valid book purchase and per-user book access are checked by the route itself.
module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No Token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('sessionVersion activeSessionId isDeleted');
    if (!user || user.isDeleted) return res.status(401).json({ success: false, message: 'Account is not available', forceLogout: true });
    if (Number(decoded.sessionVersion ?? 0) !== Number(user.sessionVersion || 0)) return res.status(401).json({ success: false, message: 'Session ended by admin. Please login again.', forceLogout: true });
    if (!decoded.activeSessionId || decoded.activeSessionId !== String(user.activeSessionId || '')) return res.status(401).json({ success: false, message: 'This device session is no longer active.', forceLogout: true });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid Token' });
  }
};
