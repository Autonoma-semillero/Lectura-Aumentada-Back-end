import { AuthPayload, AuthTokens, SessionUser } from '../types/auth.types';

/**
 * Contrato de repositorio para persistencia/lectura de autenticación.
 */
export interface IAuthRepository {
  validateUser(email: string, password: string): Promise<SessionUser | null>;
  createSession(userId: string, accessToken: string): Promise<void>;
  revokeSessionByAccessJti(jti: string): Promise<void>;
  issueTokens(payload: AuthPayload): Promise<AuthTokens>;
}
