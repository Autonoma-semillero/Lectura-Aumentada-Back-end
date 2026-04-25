import { Module } from '@nestjs/common';
import { DemoContentSeedService } from './application/demo-content-seed.service';

@Module({
  providers: [DemoContentSeedService],
})
export class SeedingModule {}
