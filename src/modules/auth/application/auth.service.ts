import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../domain/constants/auth.tokens';
import { IAuthRepository } from '../domain/interfaces/auth.repository.interface';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

/**
 * Capa application: coordina casos de uso de autenticación.
 * Sin lógica de negocio real en esta fase.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
  ) {}

  async login(dto: LoginDto): Promise<unknown> {
    return this.authRepository.validateUser(dto.email, dto.password);
  }

  async refresh(dto: RefreshTokenDto): Promise<unknown> {
    return this.authRepository.revokeSession(dto.refreshToken);
  }

  async logout(token: string): Promise<void> {
    return this.authRepository.revokeSession(token);
  }
}
