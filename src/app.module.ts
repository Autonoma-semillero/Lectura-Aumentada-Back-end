import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import databaseConfig from './config/database.config';
import envConfig from './config/env.config';
import jwtConfig from './config/jwt.config';
import { MongoDbModule } from './database/mongodb.module';
import { LearningUnitsModule } from './modules/learning-units/learning-units.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DomanModule } from './modules/doman/doman.module';
import { SeedingModule } from './modules/seeding/seeding.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, databaseConfig, jwtConfig],
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
})
export class AppModule {}
