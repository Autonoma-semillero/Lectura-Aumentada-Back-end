import { Inject, Injectable } from '@nestjs/common';
import { PROGRESS_REPOSITORY } from '../domain/constants/progress.tokens';
import { ProgressLog } from '../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../domain/interfaces/progress.repository.interface';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repository: IProgressRepository,
  ) {}

  async listByStudent(studentId: string): Promise<ProgressLog[]> {
    return this.repository.listByStudent(studentId);
  }

  async create(dto: CreateProgressLogDto): Promise<ProgressLog> {
    return this.repository.create(dto);
  }
}
