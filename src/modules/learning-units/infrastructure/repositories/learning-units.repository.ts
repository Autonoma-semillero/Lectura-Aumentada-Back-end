import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { LearningUnit } from '../../domain/interfaces/learning-unit.interface';
import { ILearningUnitsRepository } from '../../domain/interfaces/learning-units.repository.interface';

@Injectable()
export class LearningUnitsRepository implements ILearningUnitsRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  async findAll(): Promise<LearningUnit[]> {
    void this.connection;
    return [];
  }

  async findById(_id: string): Promise<LearningUnit | null> {
    void this.connection;
    return null;
  }

  async create(payload: Partial<LearningUnit>): Promise<LearningUnit> {
    void this.connection;
    return payload as LearningUnit;
  }

  async update(
    _id: string,
    payload: Partial<LearningUnit>,
  ): Promise<LearningUnit | null> {
    void this.connection;
    return payload as LearningUnit;
  }
}
