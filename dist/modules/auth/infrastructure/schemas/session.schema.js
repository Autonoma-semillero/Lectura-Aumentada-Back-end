"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSchema = void 0;
const mongoose_1 = require("mongoose");
exports.SessionSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    session_type: {
        type: String,
        enum: ['ar_experience', 'app', 'other'],
        required: true,
    },
    learning_unit_id: { type: mongoose_1.Schema.Types.ObjectId },
    marker_id: { type: String },
    started_at: { type: Date, required: true },
    ended_at: { type: Date },
    client_metadata: { type: mongoose_1.Schema.Types.Mixed },
    status: {
        type: String,
        enum: ['open', 'closed', 'cancelled'],
    },
}, {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
//# sourceMappingURL=session.schema.js.map