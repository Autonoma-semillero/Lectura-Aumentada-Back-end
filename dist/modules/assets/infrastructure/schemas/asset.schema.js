"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetSchema = void 0;
const mongoose_1 = require("mongoose");
exports.AssetSchema = new mongoose_1.Schema({
    learning_unit_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    marker_id: { type: String, required: true },
    model_3d_url: { type: String, required: true },
    audio_url: { type: String, required: true },
    image_url: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
}, { versionKey: false });
//# sourceMappingURL=asset.schema.js.map