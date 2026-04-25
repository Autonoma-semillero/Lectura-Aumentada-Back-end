"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningUnitSchema = void 0;
const mongoose_1 = require("mongoose");
const learningUnitAssetsSchema = new mongoose_1.Schema({
    model_3d: { type: String },
    audio_pronunciacion: { type: String },
}, { _id: false });
exports.LearningUnitSchema = new mongoose_1.Schema({
    word: { type: String, required: true },
    category_id: { type: mongoose_1.Schema.Types.ObjectId },
    marker_id: { type: String, required: true },
    assets: { type: learningUnitAssetsSchema, default: {} },
    metadata_accessibility: { type: mongoose_1.Schema.Types.Mixed },
    language: { type: String },
}, {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
//# sourceMappingURL=learning-unit.schema.js.map