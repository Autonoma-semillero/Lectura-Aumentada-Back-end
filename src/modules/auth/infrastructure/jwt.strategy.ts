import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRequestUser } from '../dto/auth-request-user.dto';

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  jti: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  validate(payload: JwtPayload): AuthRequestUser {
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as AuthRequestUser['role'],
      jti: payload.jti,
    };
  }
}
