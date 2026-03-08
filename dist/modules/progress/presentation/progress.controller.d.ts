import { ProgressService } from '../application/progress.service';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';
import { ListProgressQueryDto } from '../dto/list-progress-query.dto';
export declare class ProgressController {
    private readonly service;
    constructor(service: ProgressService);
    list(query: ListProgressQueryDto): Promise<unknown>;
    create(dto: CreateProgressLogDto): Promise<unknown>;
}
