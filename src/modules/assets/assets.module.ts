import { Module } from '@nestjs/common';
import { AssetsService } from './application/assets.service';
import { ASSETS_REPOSITORY } from './domain/constants/assets.tokens';
import { AssetsRepository } from './infrastructure/repositories/assets.repository';
import { AssetsController } from './presentation/assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [
    AssetsService,
    {
      provide: ASSETS_REPOSITORY,
      useClass: AssetsRepository,
    },
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
