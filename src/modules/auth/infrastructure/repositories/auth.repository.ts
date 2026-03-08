import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { IAuthRepository } from '../../domain/interfaces/auth.repository.interface';
import { AuthPayload, AuthTokens } from '../../domain/types/auth.types';

/**
 * Capa infrastructure: implementación placeholder para acceso a datos.
 */
@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(_email: string, _password: string): Promise<AuthPayload | null> {
    void this.connection;
    return null;
  }

  async createSession(_userId: string, _token: string): Promise<void> {
    void this.connection;
  }

  async revokeSession(_token: string): Promise<void> {
    void this.connection;
  }

  async issueTokens(payload: AuthPayload): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
