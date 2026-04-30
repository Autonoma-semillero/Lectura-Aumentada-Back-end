export type DomanExposureEventType =
  | 'card_shown'
  | 'card_completed'
  | 'card_skipped'
  | 'audio_played'
  | 'session_finished'
  | 'session_completed';

export interface DomanExposureLog {
  id: string;
  student_id: string;
  session_id?: string;
  word_card_id?: string;
  event_type: DomanExposureEventType;
  event_ts: Date;
  display_ms?: number;
  device?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}
