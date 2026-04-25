export type DomanSessionAudioMode = 'auto' | 'manual' | 'disabled';
export type DomanSessionStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type DomanSessionMode = 'manual' | 'auto';

export interface DomanSession {
  id: string;
  student_id: string;
  daily_plan_id: string;
  session_index: number;
  category_id: string;
  display_ms: number;
  audio_mode: DomanSessionAudioMode;
  status: DomanSessionStatus;
  mode?: DomanSessionMode;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}
