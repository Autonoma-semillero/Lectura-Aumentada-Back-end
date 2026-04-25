"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
exports.UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true },
    display_name: { type: String },
    roles: [{ type: String }],
    status: {
        type: String,
        enum: ['active', 'disabled', 'pending'],
    },
    password_hash: { type: String },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
//# sourceMappingURL=user.schema.js.map