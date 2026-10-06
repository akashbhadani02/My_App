const mongoose = require("mongoose");

const questionBankStateSchema = new mongoose.Schema(
    { initialized: { type: Boolean, default: false } },
    { timestamps: true }
);

module.exports = mongoose.model("QuestionBankState", questionBankStateSchema);
