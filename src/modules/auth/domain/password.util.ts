import { createHash, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';

const SHA256_PREFIX = 'sha256:';

/**
 * Hash seguro para persistir contraseñas (Argon2id).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Verifica contraseña contra hash Argon2id o legado `sha256:` (rehash en login vía repositorio).
 */
export async function verifyPassword(
  password: string,
  storedHash?: string,
): Promise<boolean> {
  if (!storedHash || storedHash.trim().length === 0) {
    return false;
  }

  if (storedHash.startsWith('$argon2')) {
    try {
      return await argon2.verify(storedHash, password);
    } catch {
      return false;
    }
  }

  if (storedHash.startsWith(SHA256_PREFIX)) {
    const expected = Buffer.from(removePrefix(storedHash, SHA256_PREFIX), 'hex');
    const actual = Buffer.from(
      createHash('sha256').update(password).digest('hex'),
      'hex',
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  return false;
}

export function isLegacySha256PasswordHash(storedHash?: string): boolean {
  return Boolean(storedHash?.startsWith(SHA256_PREFIX));
}

function removePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
