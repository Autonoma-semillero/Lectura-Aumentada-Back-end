export interface DomanDailyPlan {
  id: string;
  student_id: string;
  plan_date: Date;
  target_cards_count: number;
  target_sessions_count: number;
  category_id: string;
  algorithm_version?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
