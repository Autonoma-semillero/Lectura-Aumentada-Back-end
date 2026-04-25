import { Schema } from 'mongoose';

/**
 * Colección `sessions` — sesión de producto / AR (diagrama Db_1).
 * La persistencia de JWT (refresh) no forma parte de esta colección; definir otra
 * estrategia (p. ej. colección dedicada o claims stateless) al implementar auth real.
 */
export const SessionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, required: true },
    session_type: {
      type: String,
      enum: ['ar_experience', 'app', 'other'],
      required: true,
    },
    learning_unit_id: { type: Schema.Types.ObjectId },
    marker_id: { type: String },
    started_at: { type: Date, required: true },
    ended_at: { type: Date },
    client_metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['open', 'closed', 'cancelled'],
    },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
