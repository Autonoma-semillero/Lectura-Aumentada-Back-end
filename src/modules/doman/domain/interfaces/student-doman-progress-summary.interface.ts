export interface DomanSessionHistoryItem {
  session_id: string;
  daily_plan_id: string;
  category_id: string;
  session_index: number;
  status: string;
  display_ms: number;
  started_at?: Date;
  completed_at?: Date;
}

export interface StudentDomanProgressSummary {
  student_id: string;
  planned_sessions_count: number;
  in_progress_sessions_count: number;
  completed_sessions_count: number;
  cards_new_count: number;
  cards_active_count: number;
  cards_completed_count: number;
  last_activity_at?: Date;
}
