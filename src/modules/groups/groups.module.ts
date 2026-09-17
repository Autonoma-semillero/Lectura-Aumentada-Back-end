import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GroupsService } from './application/groups.service';
import { GROUPS_REPOSITORY } from './domain/constants/groups.tokens';
import { GroupsRepository } from './infrastructure/repositories/groups.repository';
import { GroupsController } from './presentation/groups.controller';

@Module({
  imports: [UsersModule],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    {
      provide: GROUPS_REPOSITORY,
      useClass: GroupsRepository,
    },
  ],
  exports: [GroupsService],
})
export class GroupsModule {}
