const express = require("express");
const router = express.Router();

const Question = require("../models/Question");
const User = require("../models/User");
const auth = require("../middleware/subscriptionAuth");
const adminAuth = require("../middleware/adminAuth");

// Aducate ships with a 500-question English practice bank.
// On first use, if the database contains fewer than 500 active questions,
// add only the missing unique questions from questions.json. Existing admin
// questions are preserved; this only fills the bank up to 500.
async function ensureQuestionsSeeded() {
    const activeCount = await Question.countDocuments({ isDeleted: { $ne: true } });
    if (activeCount >= 500) return;

    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "..", "questions.json");
    if (!fs.existsSync(file)) return;

    let bank = [];
    try { bank = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) {
        console.error("Question bank JSON read error:", e.message);
        return;
    }

    const existing = await Question.find({ isDeleted: { $ne: true } }).select("q").lean();
    const normalize = value => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
    const seen = new Set(existing.map(x => normalize(x.q)));
    const needed = Math.max(0, 500 - activeCount);
    const docs = [];

    for (const item of bank) {
        if (docs.length >= needed) break;
        const q = String(item?.q || "").trim();
        const options = Array.isArray(item?.options) ? item.options.map(String) : [];
        const correct = Number(item?.correct);
        const key = normalize(q);
        if (!q || seen.has(key) || options.length < 4 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) continue;
        if (new Set(options).size !== options.length) continue;
        docs.push({ q, options, correct });
        seen.add(key);
    }

    if (docs.length) {
        await Question.insertMany(docs, { ordered: false });
        console.log(`📚 Aducate question bank filled with ${docs.length} questions (500 minimum).`);
    }
}

function noStore(res) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
}

// Fast student quiz endpoint: return a small random batch instead of the full question bank.
router.get("/random", auth, async (req, res) => {
    noStore(res);
    try {
        const count = Math.min(20, Math.max(1, Number(req.query.count) || 10));
        await ensureQuestionsSeeded();
        const user = await User.findById(req.user.id).select("answeredQuestionIds").lean();
        const answeredIds = Array.isArray(user?.answeredQuestionIds)
            ? user.answeredQuestionIds.map(String)
            : [];

        const baseMatch = {
            isDeleted: { $ne: true },
            q: { $type: "string" },
            options: { $type: "array" }
        };
        if (answeredIds.length) baseMatch._id = { $nin: answeredIds };

        const availableCountResult = await Question.aggregate([
            { $match: baseMatch },
            { $group: { _id: { $toLower: { $trim: { input: "$q" } } } } },
            { $count: "count" }
        ]);
        const availableCount = Number(availableCountResult[0]?.count || 0);
        if (availableCount <= 0) {
            return res.json({
                success: true,
                completed: true,
                totalQuestions: 0,
                questions: [],
                message: "🎉 All available questions are completed. No repeat questions will be shown."
            });
        }

        // De-duplicate by normalized question text before sampling. This prevents
        // the same visible question from appearing again when the database contains
        // multiple records with different _ids but identical wording.
        const questions = await Question.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: { $toLower: { $trim: { input: "$q" } } },
                    question: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$question" } },
            { $sample: { size: Math.min(count, availableCount) } },
            { $project: { q: 1, options: 1, correct: 1 } }
        ]);
        const validQuestions = questions.filter(q => q.q && Array.isArray(q.options) &&
            q.options.length >= 2 && Number.isInteger(Number(q.correct)) &&
            Number(q.correct) >= 0 && Number(q.correct) < q.options.length);
        return res.json({ success: true, completed: false, totalQuestions: validQuestions.length, questions: validQuestions });
    } catch (err) {
        console.error("Random Questions Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Start a quiz question timer on the server. This makes answer timing
// authoritative instead of relying only on the browser clock.
router.post("/start", auth, async (req, res) => {
    try {
        const questionId = String(req.body?.questionId || "").trim();
        if (!questionId) return res.status(400).json({ success: false, message: "Question ID required" });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const question = await Question.findOne({ _id: questionId, isDeleted: { $ne: true } })
            .select("_id").lean();
        if (!question) return res.status(404).json({ success: false, message: "Question not found" });

        user.activeQuizQuestionId = String(question._id);
        user.activeQuizStartedAt = new Date();
        await user.save();

        return res.json({ success: true, startedAt: user.activeQuizStartedAt.toISOString() });
    } catch (err) {
        console.error("Quiz Start Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Student quiz question bank.
router.get("/", auth, async (req, res) => {
    noStore(res);
    try {
        await ensureQuestionsSeeded();

        const questions = await Question.find({ isDeleted: { $ne: true } })
            .select("q options correct")
            .lean();

        return res.json({
            success: true,
            totalQuestions: questions.length,
            questions
        });
    } catch (err) {
        console.error("Load Questions Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin question list with optional search + pagination.
router.get("/admin", adminAuth, async (req, res) => {
    try {
        await ensureQuestionsSeeded();

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const search = String(req.query.search || "").trim();
        const filter = search
            ? { isDeleted: { $ne: true }, q: { $regex: search, $options: "i" } }
            : { isDeleted: { $ne: true } };

        const [questions, total] = await Promise.all([
            Question.find(filter)
                .select("q options correct")
                .sort({ _id: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Question.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            questions,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit))
        });
    } catch (err) {
        console.error("Admin Questions Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: find repeated questions by normalized question text.
router.get("/admin/repeated", adminAuth, async (req, res) => {
    try {
        await ensureQuestionsSeeded();

        const questions = await Question.find({ isDeleted: { $ne: true } })
            .select("q options correct")
            .sort({ _id: 1 })
            .lean();

        const normalize = value => String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

        const groups = new Map();
        for (const question of questions) {
            const key = normalize(question.q);
            if (!key) continue;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(question);
        }

        const repeatedGroups = [...groups.values()]
            .filter(group => group.length > 1)
            .map(group => ({
                question: group[0].q,
                count: group.length,
                questions: group
            }));

        const repeatedQuestions = repeatedGroups.flatMap(group => group.questions);

        return res.json({
            success: true,
            repeatedCount: repeatedQuestions.length,
            duplicateGroups: repeatedGroups.length,
            groups: repeatedGroups,
            questions: repeatedQuestions
        });
    } catch (err) {
        console.error("Repeated Questions Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.get("/download", async (req, res) => {
    try {
        const questions = await Question.find({ isDeleted: { $ne: true } }).lean();

        const jsonData = questions.map(q => ({
            q: q.q,
            options: q.options,
            correct: q.correct
        }));

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=questions.json"
        );
        res.setHeader("Content-Type", "application/json");

        res.send(JSON.stringify(jsonData, null, 2));

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Download failed"
        });
    }
});
// Admin: remove repeated questions and keep the first copy of each question.
router.delete("/admin/repeated/remove", adminAuth, async (req, res) => {
    try {
        await ensureQuestionsSeeded();

        const questions = await Question.find({ isDeleted: { $ne: true } })
            .select("_id q")
            .sort({ _id: 1 })
            .lean();

        const normalize = value => String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

        const seen = new Set();
        const duplicateIds = [];

        for (const question of questions) {
            const key = normalize(question.q);
            if (!key) continue;
            if (seen.has(key)) duplicateIds.push(question._id);
            else seen.add(key);
        }

        let deleted = 0;
        if (duplicateIds.length) {
            const result = await Question.updateMany(
                { _id: { $in: duplicateIds }, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, deletedAt: new Date() } }
            );
            deleted = Number(result.modifiedCount || 0);
        }

        return res.json({
            success: true,
            deleted,
            remaining: questions.length - deleted,
            message: deleted
                ? `${deleted} repeated question(s) removed. One copy of each question was kept.`
                : "No repeated questions found."
        });
    } catch (err) {
        console.error("Remove Repeated Questions Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin can create a new question.
router.post("/admin", adminAuth, async (req, res) => {
    try {
        const { q, options, correct } = req.body;
        const cleanOptions = Array.isArray(options)
            ? options.map(value => String(value || "").trim())
            : [];
        const correctIndex = Number(correct);

        if (!String(q || "").trim() || cleanOptions.length < 2 ||
            cleanOptions.some(option => !option) ||
            !Number.isInteger(correctIndex) ||
            correctIndex < 0 || correctIndex >= cleanOptions.length) {
            return res.status(400).json({
                success: false,
                message: "Question, at least 2 options and a valid correct option are required."
            });
        }

        const question = await Question.create({
            q: String(q).trim(),
            options: cleanOptions,
            correct: correctIndex
        });

        return res.json({ success: true, message: "Question Added", question });
    } catch (err) {
        console.error("Add Question Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin can edit a question.
router.put("/admin/:id", adminAuth, async (req, res) => {
    try {
        const { q, options, correct } = req.body;
        const cleanOptions = Array.isArray(options)
            ? options.map(value => String(value || "").trim())
            : [];
        const correctIndex = Number(correct);

        if (!String(q || "").trim() || cleanOptions.length < 2 ||
            cleanOptions.some(option => !option) ||
            !Number.isInteger(correctIndex) ||
            correctIndex < 0 || correctIndex >= cleanOptions.length) {
            return res.status(400).json({
                success: false,
                message: "Question, at least 2 options and a valid correct option are required."
            });
        }

        const question = await Question.findByIdAndUpdate(
            req.params.id,
            {
                q: String(q).trim(),
                options: cleanOptions,
                correct: correctIndex
            },
            { new: true, runValidators: true }
        );

        if (!question) {
            return res.status(404).json({ success: false, message: "Question Not Found" });
        }

        return res.json({ success: true, message: "Question Updated", question });
    } catch (err) {
        console.error("Update Question Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Delete ALL Questions
router.delete("/admin/all", adminAuth, async (req, res) => {
    try {
        const result = await Question.updateMany(
            { isDeleted: { $ne: true } },
            { $set: { isDeleted: true, deletedAt: new Date() } }
        );
        return res.json({
            success: true,
            deleted: Number(result.modifiedCount || 0),
            message: `${result.modifiedCount || 0} question(s) moved to Recycle Bin.`
        });
    } catch (err) {
        console.error("Delete All Questions Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Could not delete all questions"
        });
    }
});


// Admin: PERMANENTLY delete ALL questions from MongoDB.
// This bypasses the Recycle Bin and cannot be restored.
router.delete("/admin/permanent-all", adminAuth, async (req, res) => {
    try {
        const result = await Question.deleteMany({});

        // Keep the seed state initialized so the server never recreates
        // questions automatically after this permanent purge.
        await QuestionBankState.findOneAndUpdate(
            {},
            { $set: { initialized: true } },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            deleted: Number(result.deletedCount || 0),
            message: `${result.deletedCount || 0} question(s) permanently deleted from the database.`
        });
    } catch (err) {
        console.error("Permanent Delete All Questions Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Could not permanently delete all questions"
        });
    }
});

// Admin: reset answered-question history for every student.
router.put("/admin/reset-student-progress", adminAuth, async (req, res) => {
    try {
        const result = await User.updateMany(
            {},
            { $set: { answeredQuestionIds: [], dailyQuestionsAnswered: 0, spinCycleQuestionsAnswered: 0 } }
        );
        return res.json({
            success: true,
            students: Number(result.modifiedCount || 0),
            message: `Question progress reset for ${Number(result.modifiedCount || 0)} student(s).`
        });
    } catch (err) {
        console.error("Reset Student Question Progress Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Could not reset question progress" });
    }
});

// Admin can delete a question.
router.delete("/admin/:id", adminAuth, async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, isDeleted: { $ne: true } },
            { $set: { isDeleted: true, deletedAt: new Date() } },
            { new: true }
        );
        if (!question) {
            return res.status(404).json({ success: false, message: "Question Not Found" });
        }
        return res.json({ success: true, message: "Question moved to Recycle Bin" });
    } catch (err) {
        console.error("Delete Question Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Question Recycle Bin
router.get("/admin/recycle-bin", adminAuth, async (req, res) => {
    try {
        const questions = await Question.find({ isDeleted: true })
            .select("q options correct deletedAt")
            .sort({ deletedAt: -1, _id: -1 })
            .lean();
        return res.json({ success: true, questions });
    } catch (err) {
        console.error("Question Recycle Bin Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.put("/admin/recycle-bin/:id/restore", adminAuth, async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, isDeleted: true },
            { $set: { isDeleted: false, deletedAt: null } },
            { new: true }
        );
        if (!question) {
            return res.status(404).json({ success: false, message: "Deleted question not found" });
        }
        return res.json({ success: true, message: "Question restored", question });
    } catch (err) {
        console.error("Restore Question Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.delete("/admin/recycle-bin/:id/permanent", adminAuth, async (req, res) => {
    try {
        const question = await Question.findOneAndDelete({
            _id: req.params.id,
            isDeleted: true
        });
        if (!question) {
            return res.status(404).json({ success: false, message: "Deleted question not found" });
        }
        return res.json({ success: true, message: "Question permanently deleted" });
    } catch (err) {
        console.error("Permanent Question Delete Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.delete("/admin/recycle-bin", adminAuth, async (req, res) => {
    try {
        const result = await Question.deleteMany({ isDeleted: true });
        return res.json({
            success: true,
            deleted: Number(result.deletedCount || 0),
            message: `${result.deletedCount || 0} question(s) permanently deleted.`
        });
    } catch (err) {
        console.error("Permanent Question Recycle Bin Clear Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: import questions from the project's questions.json file.
// Existing questions are detected by normalized question text, so duplicates are skipped.
router.post("/admin/import-json", adminAuth, async (req, res) => {
    try {
        const fs = require("fs");
        const path = require("path");

        const candidates = [
            path.join(__dirname, "..", "questions.json"),
            path.join(__dirname, "..", "question.json")
        ];

        const jsonPath = candidates.find(file => fs.existsSync(file));
        if (!jsonPath) {
            return res.status(404).json({
                success: false,
                message: "questions.json file not found."
            });
        }

        const raw = fs.readFileSync(jsonPath, "utf8");
        const source = JSON.parse(raw);

        if (!Array.isArray(source)) {
            return res.status(400).json({
                success: false,
                message: "JSON must contain an array of questions."
            });
        }

        const normalize = value => String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

        const existing = await Question.find().select("q").lean();
        const existingKeys = new Set(existing.map(item => normalize(item.q)));

        const docs = [];
        const seenInFile = new Set();
        let skipped = 0;

        for (const item of source) {
            const q = String(item.q || "").trim();
            const options = Array.isArray(item.options)
                ? item.options.map(value => String(value || "").trim())
                : [];
            const correct = Number(item.correct);
            const key = normalize(q);

            if (!q || options.length < 2 ||
                options.some(option => !option) ||
                !Number.isInteger(correct) ||
                correct < 0 || correct >= options.length ||
                !key || existingKeys.has(key) || seenInFile.has(key)) {
                skipped++;
                continue;
            }

            seenInFile.add(key);
            docs.push({ q, options, correct });
        }

        // Insert in batches so a large questions.json (100k+ questions) does not
        // create one oversized MongoDB operation.
        const batchSize = 1000;
        for (let i = 0; i < docs.length; i += batchSize) {
            await Question.insertMany(docs.slice(i, i + batchSize), { ordered: false });
        }

        const total = await Question.countDocuments({ isDeleted: { $ne: true } });

        return res.json({
            success: true,
            added: docs.length,
            skipped,
            total,
            message: `${docs.length} new question(s) imported from questions.json. ${skipped} duplicate/invalid question(s) skipped.`
        });
    } catch (err) {
        console.error("Import JSON Questions Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Could not import questions.json"
        });
    }
});

module.exports = { router, ensureQuestionsSeeded };
