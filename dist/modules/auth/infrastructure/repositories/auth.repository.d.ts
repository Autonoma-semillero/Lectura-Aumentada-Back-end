import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { IAuthRepository } from '../../domain/interfaces/auth.repository.interface';
import { AuthPayload, AuthTokens } from '../../domain/types/auth.types';
export declare class AuthRepository implements IAuthRepository {
    private readonly connection;
    private readonly jwtService;
    constructor(connection: Connection, jwtService: JwtService);
    validateUser(_email: string, _password: string): Promise<AuthPayload | null>;
    createSession(_userId: string, _token: string): Promise<void>;
    revokeSession(_token: string): Promise<void>;
    issueTokens(payload: AuthPayload): Promise<AuthTokens>;
}
