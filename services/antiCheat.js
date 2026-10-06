const { revokeStudentSubscription } = require("./subscriptionLifecycle");

const BLOCK_DURATION_MS = 0;
const WARNINGS_PER_BLOCK = 4;
const MAX_TEMP_BLOCKS = 0;

function getBlockRemainingMs(user, nowMs = Date.now()) {
  let untilMs = user.blockUntil ? new Date(user.blockUntil).getTime() : 0;

  // Only temporary blocks need an expiry. Never invent an expiry for
  // the 4th (permanent/admin-only) block.
  if ((!untilMs || Number.isNaN(untilMs)) &&
      !user.permanentBlocked &&
      Number(user.blockCount || 0) < 4 &&
      user.isBlocked) {
    const started = user.updatedAt ? new Date(user.updatedAt).getTime() : nowMs;
    untilMs = started + BLOCK_DURATION_MS;
  }

  return {
    untilMs,
    remainingMs: untilMs && !Number.isNaN(untilMs)
      ? Math.max(0, untilMs - nowMs)
      : 0
  };
}

async function registerViolation(user, reason) {
  const cleanReason = String(reason || "Cheating Detected").slice(0, 500);
  const blockCount = Number(user.blockCount || 0);

  // The 4th block is permanent. Only an admin can clear it.
  if (user.permanentBlocked || (blockCount >= 4 && !user.isBlocked)) {
    user.isBlocked = true;
    user.permanentBlocked = true;
    user.blockUntil = null;
    user.warningCount = 0;
    user.wallet = 0;
    user.isOnline = false;
    user.blockReason = cleanReason + " — Permanent block (4th block)";
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await revokeStudentSubscription(user, "Subscription deleted because account was permanently blocked.");
    await user.save();

    return {
      blocked: true,
      permanentBlocked: true,
      warning: false,
      warningCount: 0,
      blockCount: Math.max(4, blockCount),
      wallet: 0,
      message: "Permanent block — Admin must unblock this student."
    };
  }

  // Legacy timed-block records are converted to permanent blocks; no timer is used.
  if (user.isBlocked) {
    user.isBlocked = true;
    user.permanentBlocked = true;
    user.blockUntil = null;
    await revokeStudentSubscription(user, "Subscription deleted because account was blocked permanently.");
    await user.save();
    return { blocked:true, permanentBlocked:true, warning:false, warningCount:0, blockCount:Number(user.blockCount||0), wallet:0, remainingMs:0, message:"Permanent block — ₹200 payment required before access can be restored." };
  }

  // Every confirmed violation gives one warning.
  user.warningCount = Number(user.warningCount || 0) + 1;
  user.blockReason = cleanReason;
  user.warningHistory = Array.isArray(user.warningHistory) ? user.warningHistory : [];
  user.warningHistory.push({ time: new Date(), reason: cleanReason });
  if (user.warningHistory.length > 200) user.warningHistory = user.warningHistory.slice(-200);

  // Warnings 1-3 are warnings only. Warning 4 triggers the next block.
  if (user.warningCount < WARNINGS_PER_BLOCK) {
    await user.save();
    return {
      blocked: false,
      permanentBlocked: false,
      warning: true,
      warningCount: user.warningCount,
      remainingWarnings: WARNINGS_PER_BLOCK - user.warningCount,
      blockCount: Number(user.blockCount || 0),
      wallet: Number(user.wallet || 0)
    };
  }

  // 4th warning -> permanent block. There is no timed/3-hour block anymore.
  user.blockAt = new Date();
  user.isBlocked = true;
  user.permanentBlocked = true;
  user.blockUntil = null;
  user.blockReason = cleanReason + " — Permanent block";
  await revokeStudentSubscription(user, "Subscription deleted because account was blocked permanently.");
  await user.save();

  return {
    blocked: true,
    permanentBlocked: true,
    warning: false,
    warningCount: 0,
    blockCount: Number(user.blockCount || 0),
    wallet: 0,
    remainingMs: 0,
    message: "Permanent block — ₹200 payment required before access can be restored."
  };
}

module.exports = {
  BLOCK_DURATION_MS,
  WARNINGS_PER_BLOCK,
  MAX_TEMP_BLOCKS,
  getBlockRemainingMs,
  registerViolation
};
