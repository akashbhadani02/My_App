const mongoose = require('mongoose');

const quizAnswerHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, default: '' },
  userMobile: { type: String, default: '' },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  questionText: { type: String, default: '' },
  options: { type: [String], default: [] },
  correctIndex: { type: Number, default: 0 },
  correctAnswer: { type: String, default: '' },
  selectedIndex: { type: Number, default: null },
  selectedAnswer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  totalQuestionsAnswered: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

quizAnswerHistorySchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.models.QuizAnswerHistory || mongoose.model('QuizAnswerHistory', quizAnswerHistorySchema);
