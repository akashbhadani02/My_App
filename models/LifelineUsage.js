const mongoose = require('mongoose');

const lifelineUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, default: '' },
  userMobile: { type: String, default: '' },
  type: { type: String, enum: ['fiftyFifty','audiencePoll','askExpert','skipQuestion'], required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null, index: true },
  questionText: { type: String, default: '' },
  cycle: { type: Number, default: 0, index: true },
  totalQuestionsAnsweredAtUse: { type: Number, default: 0 },
  usedAt: { type: Date, default: Date.now, index: true },
  resetByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.LifelineUsage || mongoose.model('LifelineUsage', lifelineUsageSchema);
