import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../database/mongodb.module';
import { CategoriesModule } from '../categories/categories.module';
import { DailyPlansService } from './application/daily-plans.service';
import { DomanSessionsService } from './application/doman-sessions.service';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
} from './domain/constants/doman.tokens';
import { DailyPlansRepository } from './infrastructure/repositories/daily-plans.repository';
import { DomanSessionsRepository } from './infrastructure/repositories/doman-sessions.repository';
import { DailyPlansController } from './presentation/daily-plans.controller';
import { DomanSessionsController } from './presentation/doman-sessions.controller';

@Module({
  imports: [MongoDbModule, CategoriesModule],
  controllers: [DailyPlansController, DomanSessionsController],
  providers: [
    DailyPlansService,
    DomanSessionsService,
    {
      provide: DAILY_PLANS_REPOSITORY,
      useClass: DailyPlansRepository,
    },
    {
      provide: DOMAN_SESSIONS_REPOSITORY,
      useClass: DomanSessionsRepository,
    },
  ],
})
export class DomanModule {}
