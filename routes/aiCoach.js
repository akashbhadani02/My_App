const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// API-free English coach. This uses local, rule-based examples only; no external
// AI provider, API key, or paid API request is used.
const RULES = [
  [/\bi am agree\b/gi, "I agree", "We say ‘I agree’, not ‘I am agree’."],
  [/\bi am having ([a-z ]+)\b/gi, "I have $1", "For possession, use ‘I have’ rather than ‘I am having’."],
  [/\byesterday\s+i\s+go\b/gi, "Yesterday I went", "Use the past tense after ‘yesterday’: go → went."],
  [/\bi goed\b/gi, "I went", "‘Go’ is irregular: its past tense is ‘went’, not ‘goed’."],
  [/\b buyed\b/gi, " bought", "‘Buy’ is irregular: its past tense is ‘bought’."],
  [/\bdidn't went\b/gi, "didn't go", "After ‘didn't’, use the base verb: ‘go’, not ‘went’."],
  [/\bdoesn't likes\b/gi, "doesn't like", "After ‘doesn't’, use the base verb: ‘like’."],
  [/\bhe go\b/gi, "he goes", "In the simple present, use -s/-es with he, she, or it."],
  [/\bshe go\b/gi, "she goes", "In the simple present, use -s/-es with he, she, or it."],
  [/\bhe have\b/gi, "he has", "Use ‘has’ with he, she, or it."],
  [/\bshe have\b/gi, "she has", "Use ‘has’ with he, she, or it."],
  [/\bi didn't went\b/gi, "I didn't go", "After ‘didn't’, use the base verb ‘go’."],
  [/\bdiscuss about\b/gi, "discuss", "‘Discuss’ does not need ‘about’: say ‘discuss the topic’."],
  [/\bmore better\b/gi, "better", "‘Better’ is already comparative; don't add ‘more’."],
  [/\bvery much beautiful\b/gi, "very beautiful", "A natural phrase is ‘very beautiful’."],
  [/\bmyself ([A-Z][a-z]+)\b/g, "My name is $1", "For introductions, ‘My name is…’ sounds more natural than ‘Myself…’."],
  [/\bI am 20 years\b/gi, "I am 20 years old", "When stating age, say ‘years old’."],
  [/\breturn back\b/gi, "return", "‘Return’ already means ‘come/go back’, so ‘back’ is usually unnecessary."],
  [/\bcan able to\b/gi, "can", "Use either ‘can’ or ‘am able to’, not ‘can able to’."],
  [/\bI didn't knew\b/gi, "I didn't know", "After ‘didn't’, use the base form ‘know’."],
  [/\bI am go(ing)? to market\b/gi, "I am going to the market", "Say ‘going to the market’; include ‘the’ for this common place phrase."],
  [/\bgo to home\b/gi, "go home", "Usually say ‘go home’ without ‘to’."],
  [/\bone of the best student\b/gi, "one of the best students", "After ‘one of the’, use a plural noun: ‘students’."],
  [/\bpeople is\b/gi, "people are", "‘People’ is plural, so use ‘are’."],
  [/\bhe don't\b/gi, "he doesn't", "Use ‘doesn't’ with he, she, or it."],
  [/\bshe don't\b/gi, "she doesn't", "Use ‘doesn't’ with he, she, or it."],
  [/\ban university\b/gi, "a university", "Use ‘a’ before the ‘yu’ sound in ‘university’."],
  [/\ba apple\b/gi, "an apple", "Use ‘an’ before a vowel sound, as in ‘apple’."],
  [/\bI am fine and you\b/gi, "I am fine. And you?", "Separate the two thoughts with punctuation."],
];

function coach(message, level, goal) {
  let corrected = message.replace(/\s+/g, " ").trim();
  const tips = [];
  for (const [pattern, replacement, tip] of RULES) {
    if (pattern.test(corrected)) {
      pattern.lastIndex = 0;
      corrected = corrected.replace(pattern, replacement);
      if (!tips.includes(tip)) tips.push(tip);
    }
    pattern.lastIndex = 0;
    if (tips.length >= 4) break;
  }
  // Capitalize the first character and add terminal punctuation when missing.
  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  if (corrected && !/[.!?]$/.test(corrected)) corrected += ".";

  const beginner = String(level).toLowerCase().includes("beginner") || String(level).toLowerCase().includes("elementary");
  if (!tips.length) {
    tips.push("Your sentence did not match the common correction rules in this free coach. Check verb tense, articles (a/an/the), and subject–verb agreement.");
  }
  const phrases = [
    "Could you please…? — a polite way to ask",
    "I would like… — a polite way to say what you want",
    "In my opinion… — use this to share your view"
  ];
  const questionByGoal = {
    "job interview": "Tell me about yourself and one skill you are proud of.",
    "school or college": "Which subject do you enjoy most, and why?",
    "travel English": "How would you ask someone for directions to the railway station?",
    "speaking confidently": "What is one thing you did well today?",
    "daily conversation": "What did you do yesterday?"
  };
  return [
    "1. Corrected English\n" + corrected,
    "2. What to improve\n" + tips.slice(0, beginner ? 2 : 3).map(t => "• " + t).join("\n"),
    "3. More natural way to say it\n" + (corrected === message ? "Try adding a detail, for example: ‘I did this because…’" : corrected),
    "4. Useful phrases\n" + phrases.join("\n"),
    "5. Your next speaking question\n" + (questionByGoal[goal] || questionByGoal["daily conversation"]),
    "\nNote: This is a free, rule-based coach—not a generative AI. It recognises common patterns and may miss other errors."
  ].join("\n\n");
}

const recentRequests = new Map();
router.post("/", auth, async (req, res) => {
  const userId = String(req.user?.id || "unknown");
  const now = Date.now();
  const recent = (recentRequests.get(userId) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({ success: false, message: "થોડી વાર રાહ જુઓ અને ફરી પ્રયાસ કરો." });
  }
  recent.push(now);
  recentRequests.set(userId, recent);

  const message = String(req.body?.message || "").trim();
  const level = String(req.body?.level || "Beginner").slice(0, 30);
  const goal = String(req.body?.goal || "daily conversation").slice(0, 100);
  if (message.length < 2) return res.status(400).json({ success: false, message: "Please enter at least one English sentence." });
  if (message.length > 2500) return res.status(400).json({ success: false, message: "Please keep your answer under 2,500 characters." });

  res.set("Cache-Control", "no-store");
  return res.json({ success: true, answer: coach(message, level, goal) });
});

module.exports = router;
