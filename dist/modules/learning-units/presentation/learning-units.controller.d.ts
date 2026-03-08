import { LearningUnitsService } from '../application/learning-units.service';
import { CreateLearningUnitDto } from '../dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from '../dto/update-learning-unit.dto';
export declare class LearningUnitsController {
    private readonly service;
    constructor(service: LearningUnitsService);
    findAll(): Promise<unknown>;
    findById(id: string): Promise<unknown>;
    create(dto: CreateLearningUnitDto): Promise<unknown>;
    update(id: string, dto: UpdateLearningUnitDto): Promise<unknown>;
}
