import { Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    rol: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    institucion: { type: String },
    grado: { type: String },
    activo: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
