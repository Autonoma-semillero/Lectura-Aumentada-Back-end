import { DomanDailyPlan } from './doman-daily-plan.interface';

export interface DomanDailyPlanSummaryCard {
  id: string;
  word: string;
  status: string;
  audio_url?: string;
}

export interface DomanDailyPlanSummary {
  plan: DomanDailyPlan;
  cards_count: number;
  cards: DomanDailyPlanSummaryCard[];
  sessions_count: number;
  completed_sessions_count: number;
  pending_sessions_count: number;
  next_session_id: string | null;
}

export interface DomanDailyPlanGeneration {
  status: 'generated' | 'existing';
  plan: DomanDailyPlanSummary;
}
