const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/subscriptionAuth");

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function ensureBonus(user) {
  const today = todayKey();

  if (user.bonusDate !== today) {
    user.bonusDate = today;
    user.bonusTarget = 70 + Math.floor(Math.random() * 31);
    user.bonusProgress = 0;
    user.bonusQuizProgress = 0;
    user.bonusLearningProgress = 0;
    user.bonusUnlocked = false;
    user.bonusClaimed = false;
    user.bonusSource = "";
    user.bonusReward = 0;
    user.bonusUnlockedAt = null;
    user.bonusClaimedAt = null;
    user.bonusLastQuestionText = "";
    user.bonusLastQuestionType = "";
  }
}

router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    ensureBonus(user);
    await user.save();

    return res.json({
      success: true,
      bonus: {
        progress: Number(user.bonusProgress || 0),
        target: Number(user.bonusTarget || 0),
        quizProgress: Number(user.bonusQuizProgress || 0),
        learningProgress: Number(user.bonusLearningProgress || 0),
        unlocked: !!user.bonusUnlocked,
        claimed: !!user.bonusClaimed,
        source: user.bonusSource || "",
        reward: Number(user.bonusReward || 0)
      }
    });
  } catch (err) {
    console.error("Bonus status error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/claim", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    ensureBonus(user);

    if (!user.bonusUnlocked || user.bonusClaimed) {
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Bonus is not unlocked yet.",
        bonus: {
          progress: Number(user.bonusProgress || 0),
          target: Number(user.bonusTarget || 0),
          unlocked: !!user.bonusUnlocked,
          claimed: !!user.bonusClaimed
        }
      });
    }

    const roll = Math.random();
    const reward = roll < 0.68 ? 11 : roll < 0.93 ? 22 : roll < 0.99 ? 55 : 70;

    user.wallet = Number(user.wallet || 0) + reward;
    user.totalEarn = Number(user.totalEarn || 0) + reward;
    user.bonusReward = reward;
    user.bonusClaimed = true;
    user.bonusClaimedAt = new Date();

    await user.save();

    return res.json({
      success: true,
      reward,
      wallet: Number(user.wallet || 0),
      totalEarn: Number(user.totalEarn || 0),
      source: user.bonusSource || ""
    });
  } catch (err) {
    console.error("Bonus claim error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
