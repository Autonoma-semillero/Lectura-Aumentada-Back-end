"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressLogSchema = void 0;
const mongoose_1 = require("mongoose");
exports.ProgressLogSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    learning_unit_id: { type: mongoose_1.Schema.Types.ObjectId },
    session_id: { type: mongoose_1.Schema.Types.ObjectId },
    action: { type: String, required: true },
    ts: { type: Date, required: true },
    payload: { type: mongoose_1.Schema.Types.Mixed },
    device: { type: String },
}, {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
});
//# sourceMappingURL=progress-log.schema.js.map