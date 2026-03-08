"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySchema = void 0;
const mongoose_1 = require("mongoose");
exports.CategorySchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    created_at: { type: Date, default: Date.now },
}, { versionKey: false });
//# sourceMappingURL=category.schema.js.map