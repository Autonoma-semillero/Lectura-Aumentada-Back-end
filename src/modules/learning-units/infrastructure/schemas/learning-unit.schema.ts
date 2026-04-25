import { Schema } from 'mongoose';

const learningUnitAssetsSchema = new Schema(
  {
    model_3d: { type: String },
    audio_pronunciacion: { type: String },
  },
  { _id: false },
);

/**
 * Colección `learning_units` — activos AR embebidos en `assets` (sin colección `assets`).
 */
export const LearningUnitSchema = new Schema(
  {
    word: { type: String, required: true },
    category_id: { type: Schema.Types.ObjectId },
    marker_id: { type: String, required: true },
    assets: { type: learningUnitAssetsSchema, default: {} },
    metadata_accessibility: { type: Schema.Types.Mixed },
    language: { type: String },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
