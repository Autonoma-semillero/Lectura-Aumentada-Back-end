import {
  DomanExposureEventType,
  DomanExposureLog,
} from './doman-exposure-log.interface';

export interface DomanExposureInsertPayload {
  studentId: string;
  sessionId?: string;
  wordCardId?: string;
  eventType: DomanExposureEventType;
  eventTs: Date;
  displayMs?: number;
  device?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface IDomanExposureLogsRepository {
  create(payload: DomanExposureInsertPayload): Promise<DomanExposureLog>;
  countByWordCardAndType(
    wordCardId: string,
    eventType: DomanExposureEventType,
  ): Promise<number>;
  listByStudent(studentId: string): Promise<DomanExposureLog[]>;
}
