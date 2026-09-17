import type {
  DomanSessionAudioMode,
  DomanSessionMode,
} from './doman-session.interface';

export type DomanStudyPlanStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

export interface DomanStudyPlanCategory {
  category_id: string;
  word_card_ids: string[];
}

export interface DomanStudyPlanLevel {
  id: string;
  name: string;
  order_index: number;
  start_date: Date;
  end_date: Date;
  categories: DomanStudyPlanCategory[];
}

export interface DomanStudyPlan {
  id: string;
  name: string;
  description?: string;
  student_id: string;
  start_date: Date;
  end_date: Date;
  sessions_per_day: number;
  display_ms: number;
  audio_mode: DomanSessionAudioMode;
  mode: DomanSessionMode;
  status: DomanStudyPlanStatus;
  levels: DomanStudyPlanLevel[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
