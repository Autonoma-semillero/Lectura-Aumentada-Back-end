"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
exports.UserSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    rol: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    institucion: { type: String },
    grado: { type: String },
    activo: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
}, { versionKey: false });
//# sourceMappingURL=user.schema.js.map