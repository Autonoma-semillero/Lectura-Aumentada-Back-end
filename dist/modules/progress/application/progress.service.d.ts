import { ProgressLog } from '../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../domain/interfaces/progress.repository.interface';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';
export declare class ProgressService {
    private readonly repository;
    constructor(repository: IProgressRepository);
    listByStudent(studentId: string): Promise<ProgressLog[]>;
    create(dto: CreateProgressLogDto): Promise<ProgressLog>;
}
