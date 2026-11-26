const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true, required: true, trim: true, uppercase: true },
  reward: { type: Number, required: true },
  // 'all' can be redeemed once by each student; 'single' is restricted to targetUser.
  scope: { type: String, enum: ['all', 'single'], default: 'all' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Track which students redeemed an all-users coupon for admin long-press history.
  redeemedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    redeemedAt: { type: Date, default: Date.now }
  }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
