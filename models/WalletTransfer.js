const mongoose = require('mongoose');

const walletTransferSchema = new mongoose.Schema({
  transferKey: { type: String, required: true, unique: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderName: { type: String, default: '' },
  senderMobile: { type: String, default: '' },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientName: { type: String, default: '' },
  recipientMobile: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0.01 },
  feeRate: { type: Number, default: 5 },
  fee: { type: Number, required: true, min: 0 },
  senderDebit: { type: Number, required: true, min: 0.01 },
  recipientCredit: { type: Number, required: true, min: 0.01 },
  status: { type: String, enum: ['completed'], default: 'completed', index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

walletTransferSchema.index({ senderId:  1, createdAt: -1 });
walletTransferSchema.index({ recipientId: 1, createdAt: -1 });
module.exports = mongoose.models.WalletTransfer || mongoose.model('WalletTransfer', walletTransferSchema);
