export interface ProgressLog {
  id: string;
  user_id: string;
  learning_unit_id?: string;
  session_id?: string;
  action: string;
  ts: Date;
  payload?: Record<string, unknown>;
  device?: string;
  created_at: Date;
}
