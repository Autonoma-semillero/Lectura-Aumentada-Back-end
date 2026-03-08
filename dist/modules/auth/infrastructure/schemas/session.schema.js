"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSchema = void 0;
const mongoose_1 = require("mongoose");
exports.SessionSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    jwt_token: { type: String, required: true },
    device: { type: String },
    ip: { type: String },
    created_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
}, { versionKey: false });
//# sourceMappingURL=session.schema.js.map