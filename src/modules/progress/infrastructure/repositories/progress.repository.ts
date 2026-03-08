import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { ProgressLog } from '../../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../../domain/interfaces/progress.repository.interface';

@Injectable()
export class ProgressRepository implements IProgressRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  async listByStudent(_studentId: string): Promise<ProgressLog[]> {
    void this.connection;
    return [];
  }

  async create(payload: Partial<ProgressLog>): Promise<ProgressLog> {
    void this.connection;
    return payload as ProgressLog;
  }
}
