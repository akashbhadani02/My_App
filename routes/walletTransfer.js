const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const WalletTransfer = require('../models/WalletTransfer');
const auth = require('../middleware/subscriptionAuth');

const FEE_RATE = 5;
const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// A single idempotency key is used per user request; the database unique index
// prevents the same request from being credited twice.
router.post('/send', auth, async (req, res) => {
  const senderId = req.user.id;
  const recipientMobile = String(req.body?.recipientMobile || '').replace(/\D/g, '');
  const amount = money(req.body?.amount);
  const transferKey = String(req.body?.transferKey || '').trim();

  if (!/^\d{10,15}$/.test(recipientMobile)) return res.status(400).json({ success: false, message: 'માન્ય મોબાઇલ નંબર દાખલ કરો.' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ success: false, message: 'ટ્રાન્સફર રકમ ₹0.01 થી ₹10,00,000 વચ્ચે હોવી જોઈએ.' });
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(transferKey)) return res.status(400).json({ success: false, message: 'Invalid transfer reference. ફરી પ્રયાસ કરો.' });

  const fee = money(amount * FEE_RATE / 100);
  const senderDebit = money(amount + fee);
  try {
    const previous = await WalletTransfer.findOne({ transferKey }).lean();
    if (previous) {
      if (String(previous.senderId) !== String(senderId)) return res.status(409).json({ success: false, message: 'Transfer reference already used.' });
      return res.json({ success: true, duplicate: true, transfer: previous, message: 'આ ટ્રાન્સફર પહેલેથી પૂર્ણ થયું છે.' });
    }

    const recipient = await User.findOne({ mobile: recipientMobile, isDeleted: { $ne: true }, isBlocked: { $ne: true } }).select('_id name mobile').lean();
    if (!recipient) return res.status(404).json({ success: false, message: 'આ મોબાઇલ નંબર સાથે સક્રિય યુઝર મળ્યો નથી.' });
    if (String(recipient._id) === String(senderId)) return res.status(400).json({ success: false, message: 'તમે તમારા જ વૉલેટમાં ટ્રાન્સફર કરી શકતા નથી.' });

    // MongoDB transactions ensure sender debit, recipient credit, and history
    // either all commit or all roll back. Configure MongoDB as a replica set (Atlas supports this).
    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const sender = await User.findOneAndUpdate(
          { _id: senderId, wallet: { $gte: senderDebit }, isDeleted: { $ne: true }, isBlocked: { $ne: true } },
          { $inc: { wallet: -senderDebit } },
          { new: true, session, projection: { name: 1, mobile: 1, wallet: 1 } }
        );
        if (!sender) {
          const exists = await User.exists({ _id: senderId }).session(session);
          if (!exists) throw Object.assign(new Error('તમારું એકાઉન્ટ મળ્યું નથી.'), { statusCode: 404 });
          throw Object.assign(new Error(`પૂરતું બેલેન્સ નથી. ₹${senderDebit.toFixed(2)} જરૂરી છે (ટ્રાન્સફર ₹${amount.toFixed(2)} + ચાર્જ ₹${fee.toFixed(2)}).`), { statusCode: 400 });
        }
        const credited = await User.updateOne(
          { _id: recipient._id, isDeleted: { $ne: true }, isBlocked: { $ne: true } },
          { $inc: { wallet: amount } }, { session }
        );
        if (credited.modifiedCount !== 1) throw Object.assign(new Error('મેળવનારનું એકાઉન્ટ ઉપલબ્ધ નથી. કોઈ રકમ કપાઈ નથી.'), { statusCode: 404 });

        const docs = await WalletTransfer.create([{
          transferKey,
          senderId: sender._id, senderName: sender.name || '', senderMobile: sender.mobile || '',
          recipientId: recipient._id, recipientName: recipient.name || '', recipientMobile: recipient.mobile || '',
          amount, feeRate: FEE_RATE, fee, senderDebit, recipientCredit: amount, status: 'completed'
        }], { session });
        result = { transfer: docs[0].toObject(), senderWallet: Number(sender.wallet || 0) };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally {
      await session.endSession();
    }
    return res.json({ success: true, ...result, message: 'ટ્રાન્સફર સફળ થયું.' });
  } catch (err) {
    if (err?.code === 11000) {
      const previous = await WalletTransfer.findOne({ transferKey }).lean();
      if (previous && String(previous.senderId) === String(senderId)) return res.json({ success: true, duplicate: true, transfer: previous, message: 'આ ટ્રાન્સફર પહેલેથી પૂર્ણ થયું છે.' });
      return res.status(409).json({ success: false, message: 'આ ટ્રાન્સફર રિક્વેસ્ટ પહેલેથી વપરાઈ છે. હિસ્ટરી તપાસો.' });
    }
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    console.error('Wallet transfer failed:', err);
    return res.status(500).json({ success: false, message: err.message?.includes('Transaction numbers are only allowed') || err.message?.includes('replica set')
      ? 'તમારા MongoDB સર્વરમાં transaction/replica set સક્રિય હોવું જરૂરી છે. ટ્રાન્સફર પૂર્ણ થયું નથી.'
      : 'ટ્રાન્સફર પૂર્ણ થઈ શક્યું નથી. ફરી પ્રયાસ કરતાં પહેલાં હિસ્ટરી તપાસો.' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const rows = await WalletTransfer.find({ $or: [{ senderId: userId }, { recipientId: userId }] })
      .sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, history: rows.map(row => ({
      id: String(row._id), type: String(row.senderId) === String(userId) ? 'sent' : 'received',
      senderName: row.senderName, senderMobile: row.senderMobile,
      recipientName: row.recipientName, recipientMobile: row.recipientMobile,
      amount: row.amount, fee: row.fee, senderDebit: row.senderDebit,
      recipientCredit: row.recipientCredit, status: row.status, createdAt: row.createdAt
    })) });
  } catch (err) {
    console.error('Wallet transfer history error:', err);
    return res.status(500).json({ success: false, message: 'ટ્રાન્સફર હિસ્ટરી લોડ થઈ શકી નથી.' });
  }
});

module.exports = router;
