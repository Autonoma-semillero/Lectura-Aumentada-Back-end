import { Connection } from 'mongoose';
import { LearningUnit } from '../../domain/interfaces/learning-unit.interface';
import { ILearningUnitsRepository } from '../../domain/interfaces/learning-units.repository.interface';
export declare class LearningUnitsRepository implements ILearningUnitsRepository {
    private readonly connection;
    constructor(connection: Connection);
    findAll(): Promise<LearningUnit[]>;
    findById(_id: string): Promise<LearningUnit | null>;
    create(payload: Partial<LearningUnit>): Promise<LearningUnit>;
    update(_id: string, payload: Partial<LearningUnit>): Promise<LearningUnit | null>;
}
