import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import databaseConfig from './config/database.config';
import envConfig from './config/env.config';
import jwtConfig from './config/jwt.config';
import { MongoDbModule } from './database/mongodb.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DomanModule } from './modules/doman/doman.module';
import { LearningUnitsModule } from './modules/learning-units/learning-units.module';
import { ProgressModule } from './modules/progress/progress.module';
import { SeedingModule } from './modules/seeding/seeding.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, databaseConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 200 }],
    }),
    MongoDbModule,
    AuthModule,
    UsersModule,
    LearningUnitsModule,
    ProgressModule,
    AssetsModule,
    CategoriesModule,
    DomanModule,
    SeedingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
