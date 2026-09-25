import { Schema } from 'mongoose';

/**
 * Colección `users` — validador canónico en `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
 */
export const UserSchema = new Schema(
  {
    email: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    display_name: { type: String },
    roles: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'disabled', 'pending'],
    },
    password_hash: { type: String },
    student_pin_hash: { type: String },
    student_pin_lookup: { type: String, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
