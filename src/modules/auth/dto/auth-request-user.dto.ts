/**
 * Forma de `req.user` tras `JwtStrategy` (presentation no importa tipos de `domain`).
 */
export type AuthRequestUser = {
  userId: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  jti: string;
};
