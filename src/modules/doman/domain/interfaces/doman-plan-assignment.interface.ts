export type DomanPlanAssignmentStatus =
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed';

export type DomanPlanAudienceSource =
  | { type: 'direct' }
  | { type: 'group'; group_id: string };

export interface DomanPlanAssignmentStudent {
  student_id: string;
  sources: DomanPlanAudienceSource[];
}

export interface DomanPlanAssignmentSummary {
  total: number;
  generated: number;
  existing: number;
  failed: number;
}

export interface DomanPlanAssignmentResult {
  student_id: string;
  status: 'generated' | 'existing' | 'failed';
  plan_id?: string;
  error?: string;
  sources: DomanPlanAudienceSource[];
}

export interface DomanPlanAssignment {
  id: string;
  group_ids: string[];
  direct_student_ids: string[];
  student_ids: string[];
  students: DomanPlanAssignmentStudent[];
  category_id?: string;
  plan_date: Date;
  target_cards_count?: number;
  target_sessions_count?: number;
  display_ms?: number;
  force: boolean;
  status: DomanPlanAssignmentStatus;
  summary: DomanPlanAssignmentSummary;
  results: DomanPlanAssignmentResult[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
