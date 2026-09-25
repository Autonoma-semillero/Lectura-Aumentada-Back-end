import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../domain/constants/auth.tokens';
import { IAuthRepository } from '../domain/interfaces/auth.repository.interface';
import { SessionUser } from '../domain/types/auth.types';
import {
  AuthTokensResponseDto,
  LoginResponseDto,
  SessionUserResponseDto,
} from '../dto/login-response.dto';
import { LoginDto } from '../dto/login.dto';
import { StudentPinLoginDto } from '../dto/student-pin-login.dto';
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

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const identifier = dto.identifier ?? dto.email ?? '';
    const user = await this.authRepository.validateUser(identifier, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: resolvePrimaryRole(user.roles),
    };
    const tokens = await this.authRepository.issueTokens(payload);
    await this.authRepository.createSession(user.id, tokens.accessToken);

    return {
      accessToken: tokens.accessToken,
      user: this.mapSessionUserToDto(user),
    };
  }

  async loginWithStudentPin(dto: StudentPinLoginDto): Promise<LoginResponseDto> {
    const user = await this.authRepository.validateStudentPin(dto.pin);
    if (!user) throw new UnauthorizedException('Invalid student PIN');
    const tokens = await this.authRepository.issueTokens({ userId: user.id, email: user.email, role: 'student' });
    await this.authRepository.createSession(user.id, tokens.accessToken);
    return { accessToken: tokens.accessToken, user: this.mapSessionUserToDto(user) };
  }

  async refresh(_dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    throw new UnauthorizedException('Refresh token flow is not available yet');
  }

  async logout(accessJti: string): Promise<void> {
    await this.authRepository.revokeSessionByAccessJti(accessJti);
  }

  private mapSessionUserToDto(user: SessionUser): SessionUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      roles: user.roles,
      status: user.status,
    };
  }
}

function resolvePrimaryRole(roles: string[]): 'student' | 'teacher' | 'admin' {
  if (roles.includes('admin')) {
    return 'admin';
  }
  if (roles.includes('teacher')) {
    return 'teacher';
  }
  return 'student';
}
