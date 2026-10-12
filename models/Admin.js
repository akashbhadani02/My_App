const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    name: { type: String, default: "", trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    userLoginLocked: { type: Boolean, default: false },
    // Global book visibility control. When true, no student can open the book.
    bookGloballyClosed: { type: Boolean, default: false },
    // Admin-editable spin prize amounts (₹). Validated by admin API.
    spinPrizes: { type: [Number], default: [1,2,3,4,5,6,7,8,9,10] },
    // Admin-controlled rupee reward/deduction per correct/incorrect activity answer.
    activityRewards: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Admin-controlled main Question Bank rewards.
    questionCorrectReward: { type: Number, default: 0.50 },
    questionWrongPenalty: { type: Number, default: 0.30 },
    // Admin controlled app logo used in dashboard and PWA install icon
    appLogo: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
