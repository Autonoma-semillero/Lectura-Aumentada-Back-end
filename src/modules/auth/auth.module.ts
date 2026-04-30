import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthSeedService } from './application/auth-seed.service';
import { AuthService } from './application/auth.service';
import {
  AUTH_REPOSITORY,
  AUTH_SEED_REPOSITORY,
} from './domain/constants/auth.tokens';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthRepository } from './infrastructure/repositories/auth.repository';
import { AuthSeedRepository } from './infrastructure/repositories/auth-seed.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('jwt.secret');
        const expiresIn = configService.get<string>('jwt.expiresIn') ?? '1d';
        return {
          secret,
          signOptions: { expiresIn: expiresIn as never },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthSeedService,
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthRepository,
    },
    {
      provide: AUTH_SEED_REPOSITORY,
      useClass: AuthSeedRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
