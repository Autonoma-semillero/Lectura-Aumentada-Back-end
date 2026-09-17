import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../database/mongodb.module';
import { CategoriesModule } from '../categories/categories.module';
import { DailyPlansService } from './application/daily-plans.service';
import { DomanSessionsService } from './application/doman-sessions.service';
import { StudyPlansService } from './application/study-plans.service';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_EXPOSURE_LOGS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from './domain/constants/doman.tokens';
import { DailyPlansRepository } from './infrastructure/repositories/daily-plans.repository';
import { DomanExposureLogsRepository } from './infrastructure/repositories/doman-exposure-logs.repository';
import { DomanSessionCardsRepository } from './infrastructure/repositories/doman-session-cards.repository';
import { DomanSessionsRepository } from './infrastructure/repositories/doman-sessions.repository';
import { StudyPlansRepository } from './infrastructure/repositories/study-plans.repository';
import { DailyPlansController } from './presentation/daily-plans.controller';
import { DomanProgressController } from './presentation/doman-progress.controller';
import { DomanSessionsController } from './presentation/doman-sessions.controller';
import { StudyPlansController } from './presentation/study-plans.controller';

@Module({
  imports: [MongoDbModule, CategoriesModule],
  controllers: [
    DailyPlansController,
    DomanSessionsController,
    DomanProgressController,
    StudyPlansController,
  ],
  providers: [
    DailyPlansService,
    DomanSessionsService,
    StudyPlansService,
    {
      provide: DAILY_PLANS_REPOSITORY,
      useClass: DailyPlansRepository,
    },
    {
      provide: DOMAN_SESSIONS_REPOSITORY,
      useClass: DomanSessionsRepository,
    },
    {
      provide: DOMAN_SESSION_CARDS_REPOSITORY,
      useClass: DomanSessionCardsRepository,
    },
    {
      provide: DOMAN_EXPOSURE_LOGS_REPOSITORY,
      useClass: DomanExposureLogsRepository,
    },
    {
      provide: STUDY_PLANS_REPOSITORY,
      useClass: StudyPlansRepository,
    },
  ],
})
export class DomanModule {}
