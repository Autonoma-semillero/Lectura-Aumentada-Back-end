import { Module } from '@nestjs/common';
import { DemoContentSeedService } from './application/demo-content-seed.service';
import { DEMO_CONTENT_SEED_REPOSITORY } from './domain/constants/seeding.tokens';
import { DemoContentSeedRepository } from './infrastructure/repositories/demo-content-seed.repository';

@Module({
  providers: [
    DemoContentSeedService,
    {
      provide: DEMO_CONTENT_SEED_REPOSITORY,
      useClass: DemoContentSeedRepository,
    },
  ],
})
export class SeedingModule {}
