export type LiveDomanCard = {
  schema_version: 1;
  id: string; word: string; normalized_word: string; display_text: string;
  category_id: string; created_by: string; status: 'active' | 'archived';
  sharing_scope: 'owner_only' | 'shared'; language?: string; audio_url?: string;
  learning_unit_id?: string; content_fingerprint: string; created_at: Date; updated_at: Date;
};

export type LiveDomanRepertoire = {
  schema_version: 1;
  id: string; name: string; normalized_name: string;
  stage: 'single_words' | 'couplets' | 'sentences' | 'books'; category_id: string;
  card_ids: string[]; created_by: string; status: 'active' | 'archived';
  presentation: { default_pacing: 'teacher_controlled' | 'timed'; default_display_ms: number; audio_policy: 'teacher_voice' | 'optional_recording' | 'disabled' };
  description?: string; created_at: Date; updated_at: Date;
};

export type LiveDomanSession = {
  schema_version: 1;
  id: string; teacher_id: string; group_id: string; repertoire_id: string;
  group_snapshot: { name: string; student_ids: string[] };
  repertoire_snapshot: { name: string; stage: LiveDomanRepertoire['stage']; category_id: string; cards: Array<{ position: number; card_id: string; word: string; display_text: string; language?: string; audio_url?: string }> };
  presentation: { pacing: 'teacher_controlled' | 'timed'; display_ms: number; audio_policy: 'teacher_voice' | 'optional_recording' | 'disabled' };
  status: 'lobby' | 'running' | 'paused' | 'ended' | 'cancelled'; active_card_index: number | null; presentation_sequence: number;
  presentation_started_at?: Date; paused_at?: Date; started_at?: Date; ended_at?: Date; expires_at?: Date;
  ended_reason?: 'teacher_ended' | 'teacher_cancelled' | 'expired'; created_at: Date; updated_at: Date;
};

/** Payload deliberately safe to send to a student device or student Ably channel. */
export type StudentLiveDomanSession = {
  id: string;
  repertoire_snapshot: { name: string; cards: Array<{ position: number; display_text: string; language?: string; audio_url?: string }> };
  presentation: LiveDomanSession['presentation'];
  status: LiveDomanSession['status'];
  active_card_index: number | null;
  presentation_sequence: number;
  presentation_started_at?: Date;
  paused_at?: Date;
  ended_at?: Date;
  expires_at?: Date;
};

export type LiveDomanOutboxEvent = {
  id: string;
  kind: 'session_created' | 'session_updated' | 'participants_updated';
  session_id: string;
  attempts: number;
  available_at: Date;
  payload: Record<string, unknown>;
};

export type LiveDomanParticipant = { session_id: string; student_id: string; connection_state: 'invited' | 'connected' | 'ready' | 'disconnected' | 'left'; current_ack_sequence: number; invited_at: Date; joined_at?: Date; last_seen_at?: Date };

export interface ILiveDomanRepository {
  listCards(requesterId: string, includeShared: boolean): Promise<LiveDomanCard[]>;
  findCard(id: string): Promise<LiveDomanCard | null>;
  createCard(payload: Omit<LiveDomanCard, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanCard>;
  updateCard(id: string, patch: Partial<LiveDomanCard>): Promise<LiveDomanCard | null>;
  listRepertoires(requesterId: string, includeShared: boolean): Promise<LiveDomanRepertoire[]>;
  findRepertoire(id: string): Promise<LiveDomanRepertoire | null>;
  createRepertoire(payload: Omit<LiveDomanRepertoire, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanRepertoire>;
  updateRepertoire(id: string, patch: Partial<LiveDomanRepertoire>): Promise<LiveDomanRepertoire | null>;
  findCardsByIds(ids: string[]): Promise<LiveDomanCard[]>;
  createSession(session: Omit<LiveDomanSession, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanSession>;
  findSession(id: string): Promise<LiveDomanSession | null>;
  listSessionsForStudent(studentId: string): Promise<LiveDomanSession[]>;
  listParticipants(sessionId: string): Promise<LiveDomanParticipant[]>;
  joinSession(sessionId: string, studentId: string): Promise<LiveDomanParticipant | null>;
  touchParticipant(sessionId: string, studentId: string): Promise<boolean>;
  markStaleParticipants(now: Date, staleBefore: Date): Promise<string[]>;
  setParticipantActivity(sessionId: string, active: boolean): Promise<void>;
  applySessionCommand(sessionId: string, expectedSequence: number, patch: Partial<LiveDomanSession>, event: { command_id: string; event_type: string; actor_id: string; actor_type: 'teacher' | 'student' | 'system'; payload: Record<string, unknown> }): Promise<LiveDomanSession | null>;
  findSessionCommand(sessionId: string, commandId: string): Promise<LiveDomanSession | null>;
  recordExposures(session: LiveDomanSession): Promise<void>;
  acknowledge(sessionId: string, studentId: string, sequence: number): Promise<boolean>;
  createObservation(payload: { session_id: string; student_id: string; recorded_by: string; kind: 'engagement' | 'attention' | 'observed_response' | 'follow_up'; value: 'observed' | 'not_observed' | 'needs_follow_up'; note?: string }): Promise<void>;
  expireStaleSessions(now: Date): Promise<LiveDomanSession[]>;
  enqueueRealtimeEvent(input: { kind: LiveDomanOutboxEvent['kind']; session_id: string; payload: Record<string, unknown>; dedupe_key: string }): Promise<void>;
  claimRealtimeEvents(now: Date, limit: number): Promise<LiveDomanOutboxEvent[]>;
  markRealtimeEventDelivered(id: string): Promise<void>;
  retryRealtimeEvent(id: string, error: string, availableAt: Date): Promise<void>;
}
