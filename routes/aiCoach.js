const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// API-free English coach. Deterministic grammar rules only; no external AI API.
// Rules are deliberately specific to avoid changing already-correct sentences.
const RULES = [
  // Common fixed expressions / verb forms
  [/\bI am agree\b/gi, "I agree", "Say ‘I agree’, not ‘I am agree’. ‘Agree’ is a verb."],
  [/\bI am having ([a-z]+)\b/gi, "I have $1", "For possession, use ‘I have’, not ‘I am having’ (e.g. I have a car)."],
  [/\b(yesterday|last night|last week|last month|last year) I go\b/gi, "$1 I went", "Use the past tense with a finished past-time expression: go → went."],
  [/\bI goed\b/gi, "I went", "‘Go’ is irregular: its past tense is ‘went’, not ‘goed’."],
  [/\bbuyed\b/gi, "bought", "‘Buy’ is irregular: its past tense is ‘bought’."],
  [/\bgoed\b/gi, "went", "‘Go’ is irregular: use ‘went’ for the past tense."],
  [/\bcomed\b/gi, "came", "‘Come’ is irregular: use ‘came’ for the past tense."],
  [/\beated\b/gi, "ate", "‘Eat’ is irregular: use ‘ate’ for the past tense."],
  [/\bgoed to\b/gi, "went to", "Use ‘went’ as the past tense of ‘go’."],
  [/\bdid not went\b/gi, "did not go", "After ‘did not’, use the base verb: ‘go’, not ‘went’."],
  [/\bdidn't went\b/gi, "didn't go", "After ‘didn't’, use the base verb: ‘go’, not ‘went’."],
  [/\bdid not ate\b/gi, "did not eat", "After ‘did not’, use the base verb: ‘eat’, not ‘ate’."],
  [/\bdidn't ate\b/gi, "didn't eat", "After ‘didn't’, use the base verb: ‘eat’, not ‘ate’."],
  [/\bdid not saw\b/gi, "did not see", "After ‘did not’, use the base verb: ‘see’, not ‘saw’."],
  [/\bdidn't saw\b/gi, "didn't see", "After ‘didn't’, use the base verb: ‘see’, not ‘saw’."],
  [/\bdoesn't likes\b/gi, "doesn't like", "After ‘doesn't’, use the base verb without -s."],
  [/\bdon't likes\b/gi, "don't like", "After ‘don't’, use the base verb without -s."],
  [/\bdoesn't goes\b/gi, "doesn't go", "After ‘doesn't’, use the base verb ‘go’."],
  [/\bdon't goes\b/gi, "don't go", "After ‘don't’, use the base verb ‘go’."],
  [/\bhe don't\b/gi, "he doesn't", "Use ‘doesn't’ with he, she, and it."],
  [/\bshe don't\b/gi, "she doesn't", "Use ‘doesn't’ with he, she, and it."],
  [/\bit don't\b/gi, "it doesn't", "Use ‘doesn't’ with he, she, and it."],
  [/\bhe go\b/gi, "he goes", "In the simple present, add -s/-es with he, she, or it."],
  [/\bshe go\b/gi, "she goes", "In the simple present, add -s/-es with he, she, or it."],
  [/\bit go\b/gi, "it goes", "In the simple present, add -s/-es with he, she, or it."],
  [/\bhe have\b/gi, "he has", "Use ‘has’ with he, she, or it."],
  [/\bshe have\b/gi, "she has", "Use ‘has’ with he, she, or it."],
  [/\bit have\b/gi, "it has", "Use ‘has’ with he, she, or it."],
  [/\bI didn't knew\b/gi, "I didn't know", "After ‘didn't’, use the base verb ‘know’."],
  [/\bI didn't saw\b/gi, "I didn't see", "After ‘didn't’, use the base verb ‘see’."],
  [/\bI didn't went\b/gi, "I didn't go", "After ‘didn't’, use the base verb ‘go’."],
  [/\bI didn't ate\b/gi, "I didn't eat", "After ‘didn't’, use the base verb ‘eat’."],
  [/\bI can to ([a-z]+)\b/gi, "I can $1", "After ‘can’, use the base verb directly: ‘I can speak’."],
  [/\bcan able to\b/gi, "can", "Use either ‘can’ or ‘am/is/are able to’, not ‘can able to’."],
  [/\bdiscuss about\b/gi, "discuss", "‘Discuss’ takes a direct object: ‘discuss the topic’, not ‘discuss about the topic’."],
  [/\bmore better\b/gi, "better", "‘Better’ is already comparative; do not add ‘more’."],
  [/\bmore easier\b/gi, "easier", "‘Easier’ is already comparative; do not add ‘more’."],
  [/\bvery much beautiful\b/gi, "very beautiful", "Say ‘very beautiful’. ‘Very much’ usually modifies verbs, not adjectives like this."],
  [/\bmyself ([A-Z][a-z]+)\b/g, "My name is $1", "For an introduction, say ‘My name is …’ or ‘I am …’, not ‘Myself …’."],
  [/\bI am (\d{1,3}) years\b/gi, "I am $1 years old", "When stating age, say ‘years old’."],
  [/\breturn back\b/gi, "return", "‘Return’ already means ‘go/come back’, so ‘back’ is usually unnecessary."],
  [/\bI am go to\b/gi, "I go to", "For a habit, say ‘I go to …’; for something happening now, say ‘I am going to …’."],
  [/\bI am going to market\b/gi, "I am going to the market", "In this common phrase, say ‘the market’."],
  [/\bgo to home\b/gi, "go home", "Usually say ‘go home’ without ‘to’."],
  [/\bone of the best student\b/gi, "one of the best students", "After ‘one of the’, use a plural noun: ‘students’."],
  [/\bpeople is\b/gi, "people are", "‘People’ is plural, so use ‘are’."],
  [/\bchildren is\b/gi, "children are", "‘Children’ is plural, so use ‘are’."],
  [/\bthese is\b/gi, "these are", "Use ‘are’ with ‘these’."],
  [/\bthose is\b/gi, "those are", "Use ‘are’ with ‘those’."],
  [/\bthere is many\b/gi, "there are many", "Use ‘there are’ with plural nouns, such as ‘many books’."],
  [/\bthere is two\b/gi, "there are two", "Use ‘there are’ with plural nouns."],
  [/\ban university\b/gi, "a university", "Use ‘a’ before the ‘yu’ sound in ‘university’."],
  [/\ba apple\b/gi, "an apple", "Use ‘an’ before a vowel sound, as in ‘apple’."],
  [/\ba orange\b/gi, "an orange", "Use ‘an’ before a vowel sound, as in ‘orange’."],
  [/\ban honest man\b/gi, "an honest man", "Use ‘an’ before the vowel sound in ‘honest’."],
  [/\bI am fine and you\b/gi, "I am fine. And you?", "Use punctuation to separate the statements/questions."],
  [/\bI have 20 years\b/gi, "I am 20 years old", "In English, age is expressed with ‘be’: ‘I am 20 years old’."],
  [/\bI am having ([a-z]+) car\b/gi, "I have a $1 car", "For possession, use ‘I have’. Add an article before a singular countable noun."],
  [/\bI didn't went to\b/gi, "I didn't go to", "After ‘didn't’, use the base verb ‘go’."],
  [/\bhe is play\b/gi, "he is playing", "For an action happening now, use ‘is + verb-ing’."],
  [/\bshe is play\b/gi, "she is playing", "For an action happening now, use ‘is + verb-ing’."],
  [/\bthey is\b/gi, "they are", "Use ‘are’ with ‘they’."],
  [/\bwe is\b/gi, "we are", "Use ‘are’ with ‘we’."],
  [/\byou is\b/gi, "you are", "Use ‘are’ with ‘you’."],
  [/\bI is\b/gi, "I am", "Use ‘am’ with ‘I’."],
  [/\bhe are\b/gi, "he is", "Use ‘is’ with ‘he’."],
  [/\bshe are\b/gi, "she is", "Use ‘is’ with ‘she’."],
  [/\bit are\b/gi, "it is", "Use ‘is’ with ‘it’."],
];

function coach(message, level, goal) {
  let corrected = message.replace(/\s+/g, " ").trim();
  const tips = [];
  for (const [pattern, replacement, tip] of RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(corrected)) {
      pattern.lastIndex = 0;
      corrected = corrected.replace(pattern, replacement);
      if (!tips.includes(tip)) tips.push(tip);
    }
    pattern.lastIndex = 0;
    if (tips.length >= 6) break;
  }
  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  if (corrected && !/[.!?]$/.test(corrected)) corrected += ".";

  const beginner = /beginner|elementary/i.test(String(level));
  if (!tips.length) {
    tips.push("આ વાક્ય માટે આ coachના નિયમોમાં ચોક્કસ ભૂલ મળી નથી. આનો અર્થ વાક્ય ચોક્કસ સાચું છે એવો નથી—આ free coach દરેક grammar rule ઓળખી શકતો નથી.");
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
    "2. Grammar rule\n" + tips.slice(0, beginner ? 3 : 5).map(t => "• " + t).join("\n"),
    "3. Practice: write one new sentence using the corrected rule.",
    "4. Useful phrases\n" + phrases.join("\n"),
    "5. Your next speaking question\n" + (questionByGoal[goal] || questionByGoal["daily conversation"]),
    "\nNote: This coach works without an AI API. It checks a set of common patterns, so it cannot reliably correct every English sentence."
  ].join("\n\n");
}

const recentRequests = new Map();
router.post("/", auth, async (req, res) => {
  const userId = String(req.user?.id || "unknown");
  const now = Date.now();
  const recent = (recentRequests.get(userId) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ success: false, message: "થોડી વાર રાહ જુઓ અને ફરી પ્રયાસ કરો." });
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
