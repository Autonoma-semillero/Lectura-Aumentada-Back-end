import { Schema } from 'mongoose';

export const ProgressLogSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    learning_unit_id: { type: Schema.Types.ObjectId, required: true },
    marker_id: { type: String, required: true },
    resultado: {
      type: String,
      enum: ['correcto', 'incorrecto', 'no_detectado'],
      required: true,
    },
    tiempo_respuesta_ms: { type: Number, required: true },
    dispositivo: { type: String },
    ip: { type: String },
    fecha: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
