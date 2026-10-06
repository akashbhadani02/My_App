const BLOCK_HOURS = 0;
const WARNINGS_PER_BLOCK = 3;
const TIMED_BLOCKS = 3;

async function registerSecurityViolation(user, reason = "Security violation") {
    const now = Date.now();

    if (user.permanentBlocked || Number(user.blockCount || 0) >= TIMED_BLOCKS && user.isBlocked === true && !user.blockUntil) {
        user.permanentBlocked = true;
        user.isBlocked = true;
        user.blockUntil = null;
        user.wallet = 0;
        user.blockReason = String(reason).slice(0, 300);
        await user.save();
        return { warning:false, blocked:true, permanent:true, blockCount:Number(user.blockCount||TIMED_BLOCKS)+1, remainingMs:0 };
    }

    // If a temporary block is still active, do not create extra warnings.
    if (user.isBlocked) {
        const until = user.blockUntil ? new Date(user.blockUntil).getTime() : 0;
        if (until > now) {
            return { warning:false, blocked:true, permanent:false, blockCount:Number(user.blockCount||0), remainingMs:until-now, blockUntil:new Date(until).toISOString() };
        }
        // Expired timed block: begin a fresh 3-warning cycle.
        user.isBlocked = false;
        user.blockUntil = null;
        user.warningCycleCount = 0;
    }

    const blocks = Number(user.blockCount || 0);
    // After the third timed block, the next confirmed violation is the final
    // admin-only block: no warning and no timer.
    if (blocks >= TIMED_BLOCKS) {
        user.blockCount = blocks + 1;
        user.permanentBlocked = true;
        user.isBlocked = true;
        user.blockUntil = null;
        user.blockReason = String(reason).slice(0, 300);
        user.wallet = 0;
        user.warningHistory = Array.isArray(user.warningHistory) ? user.warningHistory : [];
        user.warningHistory.push({time:new Date(), reason:`FINAL BLOCK: ${user.blockReason}`});
        await user.save();
        return { warning:false, blocked:true, permanent:true, blockCount:user.blockCount, remainingMs:0 };
    }

    // A security violation immediately invalidates the currently displayed
    // question. Therefore an answer sent after a tab switch can never earn.
    user.activeQuizQuestionId = null;
    user.activeQuizStartedAt = null;
    user.activeActivityType = "";
    user.activeActivityQuestionId = "";
    user.activeActivityStartedAt = null;
    user.warningCycleCount = Number(user.warningCycleCount || 0) + 1;
    user.warningCount = Number(user.warningCount || 0) + 1;
    user.blockReason = String(reason).slice(0, 300);
    user.lastSecurityViolationAt = new Date();
    user.warningHistory = Array.isArray(user.warningHistory) ? user.warningHistory : [];
    user.warningHistory.push({time:new Date(), reason:user.blockReason});
    if (user.warningHistory.length > 200) user.warningHistory = user.warningHistory.slice(-200);

    if (user.warningCycleCount < WARNINGS_PER_BLOCK) {
        await user.save();
        return { warning:true, blocked:false, permanent:false, warningCount:user.warningCount, cycleWarningCount:user.warningCycleCount, remainingWarnings:WARNINGS_PER_BLOCK-user.warningCycleCount, blockCount:blocks, remainingMs:0 };
    }

    // Warning threshold reached => permanent block. No 3-hour timer.
    user.blockCount = Number(user.blockCount || 0) + 1;
    user.isBlocked = true;
    user.permanentBlocked = true;
    user.blockUntil = null;
    user.wallet = 0;
    user.activeQuizQuestionId = null;
    user.activeQuizStartedAt = null;
    user.activeActivityType = "";
    user.activeActivityQuestionId = "";
    user.activeActivityStartedAt = null;
    user.blockAt = new Date();
    user.warningHistory = Array.isArray(user.warningHistory) ? user.warningHistory : [];
    user.warningHistory.push({time:new Date(), reason:`PERMANENT BLOCK: ${user.blockReason}`});
    await user.save();

    return {warning:false, blocked:true, permanent:true, permanentBlocked:true, warningCount:user.warningCount, cycleWarningCount:user.warningCycleCount, blockCount:user.blockCount, remainingMs:0};
}

module.exports = { registerSecurityViolation, BLOCK_HOURS, WARNINGS_PER_BLOCK, TIMED_BLOCKS };
