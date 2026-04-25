import { Connection } from 'mongoose';
import { ProgressLog } from '../../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../../domain/interfaces/progress.repository.interface';
export declare class ProgressRepository implements IProgressRepository {
    private readonly connection;
    constructor(connection: Connection);
    listByUser(_userId: string): Promise<ProgressLog[]>;
    create(payload: Partial<ProgressLog>): Promise<ProgressLog>;
}
