import { Schema } from 'mongoose';

/**
 * Colección `progress_logs` — eventos de progreso / acciones del usuario.
 */
export const ProgressLogSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, required: true },
    learning_unit_id: { type: Schema.Types.ObjectId },
    session_id: { type: Schema.Types.ObjectId },
    action: { type: String, required: true },
    ts: { type: Date, required: true },
    payload: { type: Schema.Types.Mixed },
    device: { type: String },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);
