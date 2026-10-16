import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { GroupsModule } from '../groups/groups.module';
import { LiveDomanService } from './application/live-doman.service';
import { LIVE_DOMAN_REPOSITORY } from './domain/constants/live-doman.tokens';
import { LIVE_DOMAN_REALTIME } from './domain/constants/live-doman.tokens';
import { LiveDomanRepository } from './infrastructure/repositories/live-doman.repository';
import { AblyLiveDomanRealtime } from './infrastructure/realtime/ably-live-doman-realtime';
import { LiveDomanController } from './presentation/live-doman.controller';

@Module({
  imports: [CategoriesModule, GroupsModule],
  controllers: [LiveDomanController],
  providers: [
    LiveDomanService,
    { provide: LIVE_DOMAN_REPOSITORY, useClass: LiveDomanRepository },
    { provide: LIVE_DOMAN_REALTIME, useClass: AblyLiveDomanRealtime },
  ],
})
export class LiveDomanModule {}
