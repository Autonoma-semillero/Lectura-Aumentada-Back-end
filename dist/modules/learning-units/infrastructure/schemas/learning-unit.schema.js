"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningUnitSchema = void 0;
const mongoose_1 = require("mongoose");
exports.LearningUnitSchema = new mongoose_1.Schema({
    palabra: { type: String, required: true },
    categoria_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    marker_id: { type: String, required: true, unique: true },
    assets: {
        model_3d_url: { type: String, required: true },
        audio_url: { type: String, required: true },
        imagen_url: { type: String, required: true },
    },
    metadata_accesibilidad: {
        descripcion_visual: { type: String, required: true },
        alt_text: { type: String, required: true },
    },
    estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, { versionKey: false });
//# sourceMappingURL=learning-unit.schema.js.map