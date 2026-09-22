import { Schema } from 'mongoose';

const StudyPlanCategorySchema = new Schema(
  {
    category_id: { type: Schema.Types.ObjectId, required: true },
    target_cards_count: { type: Number, min: 1, max: 50 },
    word_card_ids: {
      type: [{ type: Schema.Types.ObjectId }],
      default: undefined,
    },
    word_card_words: {
      type: [String],
      default: undefined,
    },
  },
  { _id: false },
);

const StudyPlanAudienceSourceSchema = new Schema(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    group_id: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const StudyPlanAudienceStudentSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, required: true },
    sources: {
      type: [StudyPlanAudienceSourceSchema],
      required: true,
    },
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
    student_id: { type: Schema.Types.ObjectId },
    schema_version: { type: Number, default: 2 },
    group_ids: [{ type: Schema.Types.ObjectId }],
    direct_student_ids: [{ type: Schema.Types.ObjectId }],
    student_ids: [{ type: Schema.Types.ObjectId }],
    students: { type: [StudyPlanAudienceStudentSchema] },
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
