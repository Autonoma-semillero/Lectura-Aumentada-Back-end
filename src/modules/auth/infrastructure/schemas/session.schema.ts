import { Schema } from 'mongoose';

/**
 * Placeholder schema para colección sessions.
 * El detalle final se definirá durante la implementación.
 */
export const SessionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, required: true },
    jwt_token: { type: String, required: true },
    device: { type: String },
    ip: { type: String },
    created_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false },
);
