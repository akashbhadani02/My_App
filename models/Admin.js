const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    name: { type: String, default: "", trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    userLoginLocked: { type: Boolean, default: false },
    // Global book visibility control. When true, no student can open the book.
    bookGloballyClosed: { type: Boolean, default: false },
    // Admin controlled app logo used in dashboard and PWA install icon
    appLogo: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
