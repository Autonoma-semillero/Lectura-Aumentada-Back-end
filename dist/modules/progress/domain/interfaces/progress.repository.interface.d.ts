import { ProgressLog } from './progress-log.interface';
export interface IProgressRepository {
    listByStudent(studentId: string): Promise<ProgressLog[]>;
    create(payload: Partial<ProgressLog>): Promise<ProgressLog>;
}
