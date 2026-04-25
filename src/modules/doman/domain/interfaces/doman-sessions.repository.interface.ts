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
  create(payload: DomanSessionInsertPayload): Promise<DomanSession>;
  update(
    id: string,
    patch: DomanSessionPatchPayload,
  ): Promise<DomanSession | null>;
}
