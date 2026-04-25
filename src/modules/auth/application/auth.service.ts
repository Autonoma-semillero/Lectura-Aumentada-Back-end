import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../domain/constants/auth.tokens';
import { IAuthRepository } from '../domain/interfaces/auth.repository.interface';
import { AuthPayload, AuthTokens, LoginResult } from '../domain/types/auth.types';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

/**
 * Capa application: coordina casos de uso de autenticación.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.authRepository.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: resolvePrimaryRole(user.roles),
    };
    const tokens = await this.authRepository.issueTokens(payload);
    await this.authRepository.createSession(user.id, tokens.accessToken);

    return {
      accessToken: tokens.accessToken,
      user,
    };
  }

  async refresh(_dto: RefreshTokenDto): Promise<AuthTokens> {
    throw new UnauthorizedException('Refresh token flow is not available yet');
  }

  async logout(token: string): Promise<void> {
    await this.authRepository.revokeSession(token);
  }
}

function resolvePrimaryRole(roles: string[]): AuthPayload['role'] {
  if (roles.includes('admin')) {
    return 'admin';
  }
  if (roles.includes('teacher')) {
    return 'teacher';
  }
  return 'student';
}
