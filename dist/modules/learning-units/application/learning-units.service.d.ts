import { LearningUnit } from '../domain/interfaces/learning-unit.interface';
import { ILearningUnitsRepository } from '../domain/interfaces/learning-units.repository.interface';
import { CreateLearningUnitDto } from '../dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from '../dto/update-learning-unit.dto';
export declare class LearningUnitsService {
    private readonly learningUnitsRepository;
    constructor(learningUnitsRepository: ILearningUnitsRepository);
    findAll(): Promise<LearningUnit[]>;
    findById(id: string): Promise<LearningUnit | null>;
    create(dto: CreateLearningUnitDto): Promise<LearningUnit>;
    update(id: string, dto: UpdateLearningUnitDto): Promise<LearningUnit | null>;
    private toCreatePayload;
    private toUpdatePayload;
}
