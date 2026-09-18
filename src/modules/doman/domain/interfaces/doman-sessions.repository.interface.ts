import type {
  DomanSession,
  DomanSessionAudioMode,
  DomanSessionMode,
  DomanSessionStatus,
} from './doman-session.interface';

export interface DomanSessionInsertPayload {
  studentId: string;
  dailyPlanId: string;
  sessionIndex: number;
  categoryId: string;
  displayMs: number;
  audioMode: DomanSessionAudioMode;
  status: DomanSessionStatus;
  mode?: DomanSessionMode;
}

export interface DomanSessionPatchPayload {
  categoryId?: string;
  displayMs?: number;
  audioMode?: DomanSessionAudioMode;
  status?: DomanSessionStatus;
  mode?: DomanSessionMode;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IDomanSessionsRepository {
  findById(id: string): Promise<DomanSession | null>;
  findByDailyPlanId(dailyPlanId: string): Promise<DomanSession[]>;
  findByStudentAndStatuses(
    studentId: string,
    statuses: DomanSessionStatus[],
  ): Promise<DomanSession[]>;
  create(payload: DomanSessionInsertPayload): Promise<DomanSession>;
  update(
    id: string,
    patch: DomanSessionPatchPayload,
  ): Promise<DomanSession | null>;
  restoreByIds(ids: string[]): Promise<void>;
  /**
   * Reinserta sesiones borradas conservando su `_id` original, de modo que las
   * filas de `doman_session_cards` que las referencian vuelvan a resolver.
   * Compensa una regeneración fallida; no hay transacciones multi-documento.
   */
  restoreMany(sessions: DomanSession[]): Promise<void>;
  deleteById(id: string): Promise<boolean>;
  deleteByDailyPlanId(dailyPlanId: string): Promise<void>;
}
