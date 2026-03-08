import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { AUTH_REPOSITORY } from './domain/constants/auth.tokens';
import { AuthRepository } from './infrastructure/repositories/auth.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret') ?? 'change-me';
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
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
