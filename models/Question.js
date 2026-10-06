const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        q: {
            type: String,
            required: true,
            trim: true
        },
        options: {
            type: [String],
            required: true,
            validate: {
                validator: value => Array.isArray(value) && value.length >= 2,
                message: "At least 2 options are required"
            }
        },
        correct: {
            type: Number,
            required: true,
            min: 0
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
