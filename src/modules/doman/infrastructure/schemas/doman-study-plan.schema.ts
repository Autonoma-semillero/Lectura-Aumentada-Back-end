import { Schema } from 'mongoose';

const StudyPlanCategorySchema = new Schema(
  {
    category_id: { type: Schema.Types.ObjectId, required: true },
    word_card_ids: [{ type: Schema.Types.ObjectId, required: true }],
  },
  { _id: false },
);

const StudyPlanLevelSchema = new Schema(
  {
    name: { type: String, required: true },
    order_index: { type: Number, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    categories: { type: [StudyPlanCategorySchema], required: true },
  },
  { _id: true, versionKey: false },
);

export const DomanStudyPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    student_id: { type: Schema.Types.ObjectId, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    sessions_per_day: { type: Number, required: true, default: 5 },
    display_ms: { type: Number, required: true, default: 2200 },
    audio_mode: { type: String, required: true, default: 'manual' },
    mode: { type: String, required: true, default: 'auto' },
    status: { type: String, required: true, default: 'active' },
    levels: { type: [StudyPlanLevelSchema], required: true },
    created_by: { type: Schema.Types.ObjectId, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
