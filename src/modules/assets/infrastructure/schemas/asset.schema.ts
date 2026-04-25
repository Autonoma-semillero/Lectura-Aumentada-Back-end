import { Schema } from 'mongoose';

/**
 * No hay colección `assets`. Este schema describe solo la subforma embebida
 * `learning_units.assets` (mismo shape que en `learning-unit.schema.ts`).
 */
export const LearningUnitEmbeddedAssetsSchema = new Schema(
  {
    model_3d: { type: String },
    audio_pronunciacion: { type: String },
  },
  { _id: false },
);
