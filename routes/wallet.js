const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Question = require("../models/Question");
const LifelineUsage = require("../models/LifelineUsage");
const QuizAnswerHistory = require("../models/QuizAnswerHistory");
const auth = require("../middleware/subscriptionAuth");
const { registerViolation } = require("../services/antiCheat");

const DAILY_REWARD_AMOUNT = 5;
const QUIZ_CORRECT_REWARD = 0.20;
const QUIZ_WRONG_PENALTY = 0.30;
// No daily spin limit. One spin is earned for every 100 answered questions.

// India (IST) date so "daily questions" follows the student's local day.
function todayKey() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function walletResponse(user) {
    return {
        success: true,
        wallet: Number(user.wallet || 0),
        totalEarn: Number(user.totalEarn || 0),
        quizScore: Number(user.quizScore || 0),
        dailyReward: Number(user.dailyReward || 0),
        spinReward: Number(user.spinReward || 0),
        lastClaim: user.lastClaim || "",
        lastSpin: user.lastSpin || "",
        spinCount: Number(user.spinCount || 0),
        lastSpinDate: user.lastSpinDate || "",
        dailyQuestionsAnswered: Number(user.dailyQuestionsAnswered || 0),
        dailyQuestionsDate: user.dailyQuestionsDate || "",
        totalQuestionsAnswered: Number(user.totalQuestionsAnswered || 0),
        lifelines: {
            fiftyFifty: user.lifelines?.fiftyFifty !== false,
            audiencePoll: user.lifelines?.audiencePoll !== false,
            askExpert: user.lifelines?.askExpert !== false,
            skipQuestion: user.lifelines?.skipQuestion !== false
        },
        lifelineCycle: Number(user.lifelineCycle || 0),
        spinCycleQuestionsAnswered: Number(user.spinCycleQuestionsAnswered ?? user.dailyQuestionsAnswered ?? 0),
        spinQuestionsRemaining: Math.max(0, 100 - Number(user.spinCycleQuestionsAnswered ?? user.dailyQuestionsAnswered ?? 0)),
        canSpinAfterQuestions: Number(user.spinCycleQuestionsAnswered ?? user.dailyQuestionsAnswered ?? 0) >= 100,
        withdrawRequests: user.withdrawRequests || []
    };
}

// =============================
// Load Wallet - Database Source
// =============================
router.get("/", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json(walletResponse(user));
    } catch (err) {
        console.error("Load Wallet Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// =============================
// Quiz Reward
// Server decides the reward amount.
// Frontend can only tell whether
// the selected answer was correct.
// =============================
router.post("/quiz", auth, async (req, res) => {
    try {
        const { correct, questionId, selectedIndex, selectedAnswer } = req.body;

        if (typeof correct !== "boolean" || !questionId) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz result or question"
            });
        }

        const amount = correct
            ? QUIZ_CORRECT_REWARD
            : -QUIZ_WRONG_PENALTY;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const question = await Question.findOne({ _id: questionId, isDeleted: { $ne: true } }).select("_id q options correct").lean();
        if (!question) {
            return res.status(404).json({ success: false, message: "Question is no longer available" });
        }

        // Server-authoritative answer timing. The browser starts this timer via
        // POST /api/questions/start immediately before rendering the options.
        // This prevents a client-side clock from being the only anti-cheat signal.
        const activeQuestionId = String(user.activeQuizQuestionId || "");
        const startedAtMs = user.activeQuizStartedAt ? new Date(user.activeQuizStartedAt).getTime() : 0;
        const elapsedMs = startedAtMs ? Date.now() - startedAtMs : null;
        if (activeQuestionId === String(question._id) && Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < 1500) {
            user.activeQuizQuestionId = null;
            user.activeQuizStartedAt = null;
            const security = await registerViolation(user, "Answer submitted in less than 1.5 seconds");
            return res.status(200).json({ success: true, antiCheat: true, ...security });
        }

        user.activeQuizQuestionId = null;
        user.activeQuizStartedAt = null;

        const answered = Array.isArray(user.answeredQuestionIds) ? user.answeredQuestionIds : [];
        if (answered.some(id => String(id) === String(question._id))) {
            return res.status(409).json({
                success: false,
                repeated: true,
                message: "This question was already answered and cannot be repeated."
            });
        }
        user.answeredQuestionIds = answered.concat(question._id);

        // Permanent question-wise answer history for Admin analytics.
        // Store the exact question, correct answer and the answer selected by the student.
        const pickedIndex = Number.isInteger(Number(selectedIndex)) ? Number(selectedIndex) : null;
        const pickedAnswer = selectedAnswer != null ? String(selectedAnswer) : (pickedIndex != null && question.options?.[pickedIndex] != null ? String(question.options[pickedIndex]) : "");
        await QuizAnswerHistory.updateOne(
            { userId: user._id, questionId: question._id },
            { $setOnInsert: {
                userId: user._id,
                userName: user.name || "",
                userMobile: user.mobile || "",
                questionId: question._id,
                questionText: question.q || "",
                options: Array.isArray(question.options) ? question.options.map(String) : [],
                correctIndex: Number(question.correct),
                correctAnswer: Array.isArray(question.options) ? String(question.options[Number(question.correct)] ?? "") : "",
                selectedIndex: pickedIndex,
                selectedAnswer: pickedAnswer,
                isCorrect: Boolean(correct),
                answeredAt: new Date()
            }}
        );

        // =============================
        // Count today's answered questions
        // Every submitted answer counts:
        // correct OR wrong.
        // =============================
        const today = todayKey();

        if (user.dailyQuestionsDate !== today) {
            user.dailyQuestionsDate = today;
            user.dailyQuestionsAnswered = 0;
            user.spinCycleQuestionsAnswered = 0;
        }

        user.dailyQuestionsAnswered =
            Number(user.dailyQuestionsAnswered || 0) + 1;

        // Today's English Mission counts QUIZ answers only. Activities have a separate counter.
        if (user.dailyChallengeDate !== today) {
            user.dailyChallengeDate = today;
            user.dailyChallengeProgress = 0;
            user.dailyChallengeClaimed = false;
        }
        user.dailyChallengeProgress = Math.min(10, Number(user.dailyChallengeProgress || 0) + 1);

        user.spinCycleQuestionsAnswered =
            Number(user.spinCycleQuestionsAnswered ?? 0) + 1;

        // Lifetime counter for Admin reporting.
        // This never resets when the 100-question spin cycle resets.
        user.totalQuestionsAnswered =
            Number(user.totalQuestionsAnswered || 0) + 1;

        await QuizAnswerHistory.updateOne(
            { userId: user._id, questionId: question._id },
            { $set: { totalQuestionsAnswered: user.totalQuestionsAnswered } }
        );

        // Reset every KBC lifeline immediately after each 500th answered question.
        if (user.totalQuestionsAnswered % 500 === 0) {
            user.lifelines = {
                fiftyFifty: true,
                audiencePoll: true,
                askExpert: true,
                skipQuestion: true
            };
            user.lifelineCycle = Math.floor(user.totalQuestionsAnswered / 500);
        }

        user.wallet = Number(user.wallet || 0) + amount;

        // Wallet should never become negative.
        if (user.wallet < 0) {
            user.wallet = 0;
        }

        // totalEarn = only actual positive earnings.
        if (correct) {
            user.totalEarn = Number(user.totalEarn || 0) + QUIZ_CORRECT_REWARD;
            user.quizScore = Number(user.quizScore || 0) + QUIZ_CORRECT_REWARD;
        }

        await user.save();

        return res.json({
            ...walletResponse(user),
            reward: amount,
            correct
        });
    } catch (err) {
        console.error("Quiz Reward Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// =============================
// KBC Lifeline - One use per 500-question cycle
// =============================
router.post("/lifeline", auth, async (req, res) => {
    try {
        const { type, questionId } = req.body || {};
        const allowed = ["fiftyFifty", "audiencePoll", "askExpert", "skipQuestion"];
        if (!allowed.includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid lifeline" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const total = Number(user.totalQuestionsAnswered || 0);
        const cycle = Math.floor(total / 500);
        if (Number(user.lifelineCycle || 0) !== cycle) {
            user.lifelines = { fiftyFifty: true, audiencePoll: true, askExpert: true, skipQuestion: true };
            user.lifelineCycle = cycle;
        }

        if (!user.lifelines || user.lifelines[type] === false) {
            return res.status(400).json({ success: false, message: "આ Lifeline આ 500-question cycle માં પહેલેથી વપરાઈ ગઈ છે.", ...walletResponse(user) });
        }

        let question = null;
        if (questionId) {
            question = await Question.findOne({ _id: questionId, isDeleted: { $ne: true } }).select("_id q").lean();
        }

        user.lifelines[type] = false;
        await user.save();

        await LifelineUsage.create({
            userId: user._id,
            userName: user.name || "",
            userMobile: user.mobile || "",
            type,
            questionId: question?._id || null,
            questionText: String(question?.q || "").slice(0, 2000),
            cycle,
            totalQuestionsAnsweredAtUse: total,
            usedAt: new Date()
        });

        return res.json({ success: true, lifeline: type, ...walletResponse(user) });
    } catch (err) {
        console.error("Lifeline Error:", err);
        return res.status(500).json({ success: false, message: "Lifeline use કરવામાં error આવ્યો." });
    }
});

// =============================
// Daily Reward - Once Per Day
// =============================
router.post("/daily-reward", auth, async (req, res) => {
    try {
        const today = todayKey();
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.lastClaim === today) {
            return res.status(400).json({
                success: false,
                message: "તમે આજનો Daily Reward લઈ લીધો છે! કાલે ફરી લઈ શકશો.",
                ...walletResponse(user)
            });
        }

        user.wallet = Number(user.wallet || 0) + DAILY_REWARD_AMOUNT;
        user.totalEarn = Number(user.totalEarn || 0) + DAILY_REWARD_AMOUNT;
        user.dailyReward = Number(user.dailyReward || 0) + DAILY_REWARD_AMOUNT;
        user.lastClaim = today;

        await user.save();

        return res.json({
            ...walletResponse(user),
            reward: DAILY_REWARD_AMOUNT
        });
    } catch (err) {
        console.error("Daily Reward Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// =============================
// Spin Wheel - 1 Spin Per 100 Questions
// =============================
router.post("/spin", auth, async (req, res) => {
    try {
        const today = todayKey();
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.lastSpinDate !== today) {
            user.spinCount = 0;
            user.lastSpinDate = today;
        }

        // A student must answer 100 quiz questions today
        // before the Spin Wheel becomes available.
        if (user.dailyQuestionsDate !== today) {
            user.dailyQuestionsDate = today;
            user.dailyQuestionsAnswered = 0;
            user.spinCycleQuestionsAnswered = 0;
        }

        // Spin eligibility uses the current 100-question cycle.
        // Today's total count is NOT reset after spinning.
        const cycleCount = Number(user.spinCycleQuestionsAnswered ?? user.dailyQuestionsAnswered ?? 0);

        if (cycleCount < 100) {
            const remaining = 100 - cycleCount;

            return res.status(400).json({
                success: false,
                message: `Spin કરવા માટે આજે હજુ ${remaining} પ્રશ્નોના જવાબ આપવાના બાકી છે. 100 પ્રશ્નો પૂર્ણ કર્યા પછી જ Spin કરી શકશો.`,
                remainingQuestions: remaining,
                ...walletResponse(user)
            });
        }

        // Every completed set of 100 questions gives one spin.
        // There is no daily spin limit: after each spin the current
        // 100-question cycle starts again from 0.
//************************************************************* */
        const prize = Math.floor(Math.random() * 10) + 1;
//************************************************************* */
        user.spinCount = Number(user.spinCount || 0) + 1;
        user.lastSpinDate = today;
        user.lastSpin = today;

        // Reset ONLY the current spin-cycle counter.
        // Today's total and lifetime total remain unchanged.
        user.spinCycleQuestionsAnswered = 0;

        user.wallet = Number(user.wallet || 0) + prize;
        user.totalEarn = Number(user.totalEarn || 0) + prize;
        user.spinReward = Number(user.spinReward || 0) + prize;

        await user.save();

        return res.json({
            ...walletResponse(user),
            prize,
            remainingSpins: null,
            nextSpinQuestions: 100
        });
    } catch (err) {
        console.error("Spin Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// =============================
// Withdraw Request
// Minimum Wallet: ₹500
// =============================
router.post("/withdraw", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const wallet = Number(user.wallet || 0);

        // Minimum ₹1000 required
        if (wallet < 1000) {
            return res.status(400).json({
                success: false,
                message: "Withdraw કરવા માટે Wallet માં ઓછામાં ઓછા ₹1000 હોવા જોઈએ.",
                ...walletResponse(user)
            });
        }

        // Only one Pending request at a time
        const pendingRequest = (user.withdrawRequests || []).find(
            request => request.status === "Pending"
        );

        if (pendingRequest) {
            return res.status(400).json({
                success: false,
                message: "તમારી Withdraw Request પહેલેથી Pending છે.",
                ...walletResponse(user)
            });
        }

        const {
    paymentMethod,
    upiId,
    bankName,
    accountHolderName,
    accountNumber,
    ifscCode
} = req.body;

        const amount = wallet;

        // Save withdraw request in the same User document
        user.withdrawRequests.push({

    amount,

    fullName: user.name,
    mobileNumber: user.mobile,

    paymentMethod, 

    upiId,

    bankName,

    accountHolderName,

    accountNumber,

    ifscCode,

    status: "Pending",

    date: new Date()

});

        // Lock/deduct the requested wallet amount while request is pending.
        // If Admin rejects it, admin route refunds this amount.
        user.wallet = 0;

        await user.save();

        return res.json({
            ...walletResponse(user),
            message: "Withdraw Request Admin ને મોકલવામાં આવી છે.",
            withdrawAmount: amount
        });

    } catch (err) {
        console.error("Withdraw Request Error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;
