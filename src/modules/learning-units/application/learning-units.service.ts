import { Inject, Injectable } from '@nestjs/common';
import { LEARNING_UNITS_REPOSITORY } from '../domain/constants/learning-units.tokens';
import { LearningUnit } from '../domain/interfaces/learning-unit.interface';
import { ILearningUnitsRepository } from '../domain/interfaces/learning-units.repository.interface';
import { CreateLearningUnitDto } from '../dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from '../dto/update-learning-unit.dto';

@Injectable()
export class LearningUnitsService {
  constructor(
    @Inject(LEARNING_UNITS_REPOSITORY)
    private readonly repository: ILearningUnitsRepository,
  ) {}

  async findAll(): Promise<LearningUnit[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<LearningUnit | null> {
    return this.repository.findById(id);
  }

  async create(dto: CreateLearningUnitDto): Promise<LearningUnit> {
    return this.repository.create(dto as unknown as Partial<LearningUnit>);
  }

  async update(
    id: string,
    dto: UpdateLearningUnitDto,
  ): Promise<LearningUnit | null> {
    return this.repository.update(id, dto as unknown as Partial<LearningUnit>);
  }
}
