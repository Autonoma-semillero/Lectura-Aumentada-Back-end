import { Schema } from 'mongoose';

/**
 * Colección `student_group_memberships` — relación N:M entre grupos y estudiantes.
 */
export const StudentGroupMembershipSchema = new Schema(
  {
    group_id: { type: Schema.Types.ObjectId, required: true },
    student_id: { type: Schema.Types.ObjectId, required: true },
    added_by: { type: Schema.Types.ObjectId, required: true },
    created_at: { type: Date, required: true, default: Date.now },
  },
  {
    collection: 'student_group_memberships',
    versionKey: false,
  },
);
