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
    private readonly learningUnitsRepository: ILearningUnitsRepository,
  ) {}

  async findAll(): Promise<LearningUnit[]> {
    return this.learningUnitsRepository.findAll();
  }

  async findById(id: string): Promise<LearningUnit | null> {
    return this.learningUnitsRepository.findById(id);
  }

  async create(dto: CreateLearningUnitDto): Promise<LearningUnit> {
    return this.learningUnitsRepository.create(
      this.toCreatePayload(dto),
    );
  }

  async update(
    id: string,
    dto: UpdateLearningUnitDto,
  ): Promise<LearningUnit | null> {
    return this.learningUnitsRepository.update(id, this.toUpdatePayload(dto));
  }

  private toCreatePayload(dto: CreateLearningUnitDto): Partial<LearningUnit> {
    return {
      word: dto.word,
      category_id: dto.category_id,
      marker_id: dto.marker_id,
      assets: {
        model_3d: dto.model_3d,
        audio_pronunciacion: dto.audio_pronunciacion,
      },
      metadata_accessibility: dto.metadata_accessibility,
      language: dto.language,
    };
  }

  private toUpdatePayload(dto: UpdateLearningUnitDto): Partial<LearningUnit> {
    const payload: Partial<LearningUnit> = {};
    if (dto.word !== undefined) {
      payload.word = dto.word;
    }
    if (dto.category_id !== undefined) {
      payload.category_id = dto.category_id;
    }
    if (dto.marker_id !== undefined) {
      payload.marker_id = dto.marker_id;
    }
    const { model_3d, audio_pronunciacion } = dto;
    if (model_3d !== undefined || audio_pronunciacion !== undefined) {
      payload.assets = {
        model_3d,
        audio_pronunciacion,
      };
    }
    if (dto.metadata_accessibility !== undefined) {
      payload.metadata_accessibility = dto.metadata_accessibility;
    }
    if (dto.language !== undefined) {
      payload.language = dto.language;
    }
    return payload;
  }
}
