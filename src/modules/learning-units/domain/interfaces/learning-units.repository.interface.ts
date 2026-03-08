import { LearningUnit } from './learning-unit.interface';

export interface ILearningUnitsRepository {
  findAll(): Promise<LearningUnit[]>;
  findById(id: string): Promise<LearningUnit | null>;
  create(payload: Partial<LearningUnit>): Promise<LearningUnit>;
  update(id: string, payload: Partial<LearningUnit>): Promise<LearningUnit | null>;
}
