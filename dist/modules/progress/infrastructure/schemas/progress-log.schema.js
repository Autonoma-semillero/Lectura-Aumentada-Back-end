"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressLogSchema = void 0;
const mongoose_1 = require("mongoose");
exports.ProgressLogSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    learning_unit_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    marker_id: { type: String, required: true },
    resultado: {
        type: String,
        enum: ['correcto', 'incorrecto', 'no_detectado'],
        required: true,
    },
    tiempo_respuesta_ms: { type: Number, required: true },
    dispositivo: { type: String },
    ip: { type: String },
    fecha: { type: Date, default: Date.now },
}, { versionKey: false });
//# sourceMappingURL=progress-log.schema.js.map