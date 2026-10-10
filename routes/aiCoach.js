const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// Small in-memory guard against accidental rapid repeated requests.
// Vercel instances are ephemeral, so this is a convenience guard, not a billing limit.
const recentRequests = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 8;

router.post("/", auth, async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "AI Coach is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables and redeploy."
            });
        }

        const userId = String(req.user?.id || "unknown");
        const now = Date.now();
        const recent = (recentRequests.get(userId) || []).filter(t => now - t < WINDOW_MS);
        if (recent.length >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: "You have sent several requests. Please wait one minute and try again."
            });
        }
        recent.push(now);
        recentRequests.set(userId, recent);

        const message = String(req.body?.message || "").trim();
        const level = String(req.body?.level || "Beginner").slice(0, 30);
        const goal = String(req.body?.goal || "daily conversation").slice(0, 100);

        if (message.length < 2) {
            return res.status(400).json({ success: false, message: "Please enter at least one English sentence." });
        }
        if (message.length > 2500) {
            return res.status(400).json({ success: false, message: "Please keep your answer under 2,500 characters." });
        }

        const prompt = [
            "You are a kind, encouraging English speaking coach for Indian learners.",
            "Reply in simple English. Use Gujarati only for a short explanation when it will help a beginner.",
            "Do not shame the learner. Keep feedback concise and practical.",
            "Format your response with these headings:",
            "1. Corrected English",
            "2. What to improve (explain up to 3 important corrections)",
            "3. More natural way to say it",
            "4. Three useful words or phrases (with simple meanings)",
            "5. Your next speaking question",
            "If the learner's English is already correct, say so and offer a more natural alternative if useful.",
            "Do not claim to have heard pronunciation; you only receive text.",
            `Learner level: ${level}. Practice goal: ${goal}.`
        ].join("\n");

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
                instructions: prompt,
                input: message,
                max_output_tokens: 700
            }),
            signal: AbortSignal.timeout(30000)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error("OpenAI API request failed:", response.status, data?.error?.code || "unknown");
            if (response.status === 401) {
                return res.status(502).json({ success: false, message: "The OpenAI API key was rejected. Check the key in Vercel and redeploy." });
            }
            if (response.status === 429) {
                return res.status(429).json({ success: false, message: "OpenAI API usage or rate limit reached. Check API billing and limits." });
            }
            return res.status(502).json({ success: false, message: "The AI service could not answer right now. Please try again shortly." });
        }

        let answer = String(data.output_text || "").trim();
        if (!answer && Array.isArray(data.output)) {
            answer = data.output.flatMap(item => Array.isArray(item.content) ? item.content : [])
                .filter(item => item.type === "output_text")
                .map(item => item.text || "")
                .join("\n").trim();
        }
        if (!answer) {
            return res.status(502).json({ success: false, message: "The AI returned an empty answer. Please try again." });
        }

        res.set("Cache-Control", "no-store");
        return res.json({ success: true, answer });
    } catch (error) {
        if (error?.name === "TimeoutError" || error?.name === "AbortError") {
            return res.status(504).json({ success: false, message: "The AI took too long to answer. Please try again." });
        }
        console.error("AI Coach error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
});

module.exports = router;
