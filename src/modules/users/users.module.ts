import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { USERS_REPOSITORY } from './domain/constants/users.tokens';
import { UsersRepository } from './infrastructure/repositories/users.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
