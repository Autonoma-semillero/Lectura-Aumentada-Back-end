import { DomanSessionCard } from './doman-session-card.interface';

export interface DomanSessionCardInsertPayload {
  sessionId: string;
  wordCardId: string;
  orderIndex: number;
}

export interface IDomanSessionCardsRepository {
  listBySessionId(sessionId: string): Promise<DomanSessionCard[]>;
  findBySessionIdAndWordCardId(
    sessionId: string,
    wordCardId: string,
  ): Promise<DomanSessionCard | null>;
  createMany(payloads: DomanSessionCardInsertPayload[]): Promise<void>;
  touchDisplayedAt(sessionId: string, wordCardId: string, when: Date): Promise<void>;
  touchAudioPlayedAt(sessionId: string, wordCardId: string, when: Date): Promise<void>;
  deleteBySessionIds(sessionIds: string[]): Promise<void>;
}
