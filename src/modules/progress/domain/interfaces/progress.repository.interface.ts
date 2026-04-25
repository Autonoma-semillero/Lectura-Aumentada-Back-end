import { ProgressLog } from './progress-log.interface';

export interface IProgressRepository {
  listByUser(userId: string): Promise<ProgressLog[]>;
  create(payload: Partial<ProgressLog>): Promise<ProgressLog>;
}
