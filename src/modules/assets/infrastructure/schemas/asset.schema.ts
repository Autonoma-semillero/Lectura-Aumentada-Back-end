import { Schema } from 'mongoose';

/**
 * Placeholder para activos AR.
 * Nota: los binarios no se guardan en MongoDB, solo URLs/rutas.
 */
export const AssetSchema = new Schema(
  {
    learning_unit_id: { type: Schema.Types.ObjectId, required: true },
    marker_id: { type: String, required: true },
    model_3d_url: { type: String, required: true },
    audio_url: { type: String, required: true },
    image_url: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
