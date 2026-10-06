const Subscription = require("../models/Subscription");

async function revokeStudentSubscription(user, note = "Subscription revoked because account was permanently blocked.") {
    if (!user) return;

    // IMPORTANT: Keep the existing subscription/payment request in Admin.
    // Permanent blocking removes the student's active access, but it must NOT
    // silently delete the Admin's subscription history/request. The Admin can
    // explicitly delete the request using the Delete Request button.
    await Subscription.updateMany(
        { userId: user._id, status: { $in: ["pending", "confirmed"] } },
        {
            $set: {
                status: "rejected",
                confirmedAt: null,
                confirmedBy: null,
                adminNote: note
            }
        }
    );

    user.subscriptionStatus = "inactive";
    user.subscriptionAccess = false;
    user.subscriptionAmount = 200;
    user.subscriptionPaymentReference = "";
    user.subscriptionRequestedAt = null;
    user.subscriptionConfirmedAt = null;
    user.subscriptionConfirmedBy = null;
    user.subscriptionAdminNote = note;
}

module.exports = { revokeStudentSubscription };
