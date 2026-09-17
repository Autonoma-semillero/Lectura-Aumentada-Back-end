export type StudentGroupStatus = 'active' | 'archived';

export interface StudentGroup {
  id: string;
  name: string;
  normalized_name: string;
  description?: string;
  teacher_id: string;
  status: StudentGroupStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
