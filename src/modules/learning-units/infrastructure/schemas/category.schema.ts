import { Schema } from 'mongoose';

export const CategorySchema = new Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
