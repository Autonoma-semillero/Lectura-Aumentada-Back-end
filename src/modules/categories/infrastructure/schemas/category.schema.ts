import { Schema } from 'mongoose';

/**
 * Colección `categories` (temáticas en el modelo del repo) — validador en
 * `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
 */
export const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    parent_id: { type: Schema.Types.ObjectId },
    sort_order: { type: Number },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
