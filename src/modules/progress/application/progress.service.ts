import { Inject, Injectable } from '@nestjs/common';
import { PROGRESS_REPOSITORY } from '../domain/constants/progress.tokens';
import { ProgressLog } from '../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../domain/interfaces/progress.repository.interface';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly progressRepository: IProgressRepository,
  ) {}

  async listByUser(userId: string): Promise<ProgressLog[]> {
    return this.progressRepository.listByUser(userId);
  }

  async create(dto: CreateProgressLogDto): Promise<ProgressLog> {
    return this.progressRepository.create({
      user_id: dto.user_id,
      learning_unit_id: dto.learning_unit_id,
      session_id: dto.session_id,
      action: dto.action,
      ts: dto.ts,
      payload: dto.payload,
      device: dto.device,
    });
  }
}
