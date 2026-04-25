/**
 * Esquemas Mongoose alineados a las colecciones Doman del script canónico
 * `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
 * Referencia para repositorios; registrar modelos cuando exista el módulo de dominio Doman.
 */
import { Schema } from 'mongoose';

export const DomanWordCardSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    word: { type: String, required: true },
    audio_url: { type: String },
    language: { type: String },
    status: {
      type: String,
      enum: ['new', 'active', 'completed', 'archived'],
      required: true,
    },
    category_id: { type: Schema.Types.ObjectId },
    learning_unit_id: { type: Schema.Types.ObjectId },
    initial_letter: { type: String, required: true },
    times_shown: { type: Number, required: true },
    times_audio_played: { type: Number },
    last_shown_at: { type: Date },
    completed_at: { type: Date },
    created_by: { type: Schema.Types.ObjectId },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DomanDailyPlanSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    plan_date: { type: Date, required: true },
    target_cards_count: { type: Number, required: true },
    target_sessions_count: { type: Number, required: true },
    category_id: { type: Schema.Types.ObjectId },
    algorithm_version: { type: String },
    notes: { type: String },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DomanSessionSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    daily_plan_id: { type: Schema.Types.ObjectId, required: true },
    session_index: { type: Number, required: true },
    category_id: { type: Schema.Types.ObjectId },
    mode: { type: String, enum: ['manual', 'auto'] },
    display_ms: { type: Number, required: true },
    audio_mode: {
      type: String,
      enum: ['auto', 'manual', 'disabled'],
      required: true,
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      required: true,
    },
    started_at: { type: Date },
    completed_at: { type: Date },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DomanSessionCardSchema = new Schema(
  {
    session_id: { type: Schema.Types.ObjectId, required: true },
    word_card_id: { type: Schema.Types.ObjectId, required: true },
    order_index: { type: Number, required: true },
    displayed_at: { type: Date },
    audio_played_at: { type: Date },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

export const DomanExposureLogSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    session_id: { type: Schema.Types.ObjectId },
    word_card_id: { type: Schema.Types.ObjectId },
    event_type: {
      type: String,
      enum: ['card_shown', 'audio_played', 'session_completed'],
      required: true,
    },
    event_ts: { type: Date, required: true },
    display_ms: { type: Number },
    device: { type: String },
    ip: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { versionKey: false },
);
