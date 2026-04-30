import { registerAs } from '@nestjs/config';

function requireJwtSecret(): string {
  const raw = process.env.JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      'JWT_SECRET must be set in the environment and be at least 32 characters long.',
    );
  }
  const forbidden = new Set([
    'change-me',
    'change-me-super-secret',
    'secret',
    'your-secret-key',
  ]);
  if (forbidden.has(raw.toLowerCase())) {
    throw new Error('JWT_SECRET must not use a known weak or placeholder value.');
  }
  return raw;
}

export default registerAs('jwt', () => ({
  secret: requireJwtSecret(),
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
}));
