import { Schema } from 'mongoose';

/**
 * Colección `student_groups` — validador canónico en
 * `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
 */
export const StudentGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    normalized_name: { type: String, required: true },
    description: { type: String },
    teacher_id: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['active', 'archived'],
      required: true,
      default: 'active',
    },
    created_by: { type: Schema.Types.ObjectId, required: true },
  },
  {
    collection: 'student_groups',
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

StudentGroupSchema.index(
  { teacher_id: 1, normalized_name: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'ux_student_groups_teacher_active_name',
  },
);
