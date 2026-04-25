"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningUnitEmbeddedAssetsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.LearningUnitEmbeddedAssetsSchema = new mongoose_1.Schema({
    model_3d: { type: String },
    audio_pronunciacion: { type: String },
}, { _id: false });
//# sourceMappingURL=asset.schema.js.map