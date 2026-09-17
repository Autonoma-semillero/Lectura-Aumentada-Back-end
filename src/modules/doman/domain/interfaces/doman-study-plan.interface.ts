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
  /** Dynamic v2 rule. Cards are resolved independently for every student. */
  target_cards_count?: number;
  /** Legacy exact selection kept for dual-read compatibility. */
  word_card_ids?: string[];
}

export type DomanStudyPlanAudienceSource =
  | { type: 'direct' }
  | { type: 'group'; group_id: string };

export interface DomanStudyPlanAudienceStudent {
  student_id: string;
  sources: DomanStudyPlanAudienceSource[];
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
  /** Legacy singleton owner. New v2 documents omit this field. */
  student_id?: string;
  group_ids: string[];
  direct_student_ids: string[];
  student_ids: string[];
  students: DomanStudyPlanAudienceStudent[];
  schema_version: number;
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
