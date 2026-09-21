import { Schema } from 'mongoose';

/**
 * Colección `markers` — validador e índices canónicos en
 * `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
 */
export const MarkerSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    model_3d_url: { type: String },
    model_3d_format: { type: String, enum: ['glb', 'gltf'] },
    model_3d_updated_at: { type: Date },
    status: { type: String, required: true, enum: ['active', 'archived'] },
    created_by: { type: Schema.Types.ObjectId, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
