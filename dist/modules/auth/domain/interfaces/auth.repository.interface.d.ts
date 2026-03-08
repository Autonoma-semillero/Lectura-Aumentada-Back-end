import { AuthPayload, AuthTokens } from '../types/auth.types';
export interface IAuthRepository {
    validateUser(email: string, password: string): Promise<AuthPayload | null>;
    createSession(userId: string, token: string): Promise<void>;
    revokeSession(token: string): Promise<void>;
    issueTokens(payload: AuthPayload): Promise<AuthTokens>;
}
