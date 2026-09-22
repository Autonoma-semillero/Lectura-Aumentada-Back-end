import { Module } from '@nestjs/common';
import { MarkersService } from './application/markers.service';
import { MARKERS_REPOSITORY } from './domain/constants/markers.tokens';
import { MarkersRepository } from './infrastructure/repositories/markers.repository';
import { MarkersController } from './presentation/markers.controller';

@Module({
  controllers: [MarkersController],
  providers: [
    MarkersService,
    {
      provide: MARKERS_REPOSITORY,
      useClass: MarkersRepository,
    },
  ],
  exports: [MarkersService],
})
export class MarkersModule {}
