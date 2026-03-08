import { Module } from '@nestjs/common';
import { ProgressService } from './application/progress.service';
import { PROGRESS_REPOSITORY } from './domain/constants/progress.tokens';
import { ProgressRepository } from './infrastructure/repositories/progress.repository';
import { ProgressController } from './presentation/progress.controller';

@Module({
  controllers: [ProgressController],
  providers: [
    ProgressService,
    {
      provide: PROGRESS_REPOSITORY,
      useClass: ProgressRepository,
    },
  ],
  exports: [ProgressService],
})
export class ProgressModule {}
