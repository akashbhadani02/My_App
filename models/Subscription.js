const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, default: '' },
    studentMobile: { type: String, default: '' },
    amount: { type: Number, default: 200 },
    paymentReference: { type: String, default: '' },
    paymentScreenshot: { type: String, default: '' },
    paymentScreenshotName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending', index: true },
    submittedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    adminNote: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
