import { Module } from '@nestjs/common';
import { LearningUnitsService } from './application/learning-units.service';
import { LEARNING_UNITS_REPOSITORY } from './domain/constants/learning-units.tokens';
import { LearningUnitsRepository } from './infrastructure/repositories/learning-units.repository';
import { LearningUnitsController } from './presentation/learning-units.controller';

@Module({
  controllers: [LearningUnitsController],
  providers: [
    LearningUnitsService,
    {
      provide: LEARNING_UNITS_REPOSITORY,
      useClass: LearningUnitsRepository,
    },
  ],
  exports: [LearningUnitsService],
})
export class LearningUnitsModule {}
