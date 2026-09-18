import {
  DomanSessionCard,
  DomanSessionCardSnapshot,
} from './doman-session-card.interface';

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
  resetBySessionIds(sessionIds: string[]): Promise<void>;
  /**
   * Reinserta filas puente borradas conservando `_id`, `order_index` y las
   * marcas de exposición, para compensar una regeneración fallida.
   */
  restoreMany(cards: DomanSessionCardSnapshot[]): Promise<void>;
  deleteBySessionIds(sessionIds: string[]): Promise<void>;
}
