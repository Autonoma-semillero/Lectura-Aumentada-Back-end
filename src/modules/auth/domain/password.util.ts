import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import * as argon2 from 'argon2';

const SHA256_PREFIX = 'sha256:';
const SCRYPT_PREFIX = 'scrypt:';
const SCRYPT_KEY_LENGTH = 64;
const scrypt = promisify(nodeScrypt);

/**
 * Hash seguro para persistir contraseñas (Argon2id, con scrypt como respaldo
 * portable para runtimes serverless sin soporte nativo completo).
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, { type: argon2.argon2id });
  } catch {
    // Some serverless runtimes cannot execute argon2's native hash binding even
    // when the application can load. Keep account creation available with the
    // built-in, memory-hard scrypt implementation instead of returning a 500.
    return hashPasswordWithScrypt(password);
  }
}

/**
 * Verifica contraseña contra Argon2id, scrypt o el formato legado `sha256:`.
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

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    return verifyScryptPassword(password, storedHash);
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

async function hashPasswordWithScrypt(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
  )) as Buffer;
  return `${SCRYPT_PREFIX}${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyScryptPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [, saltHex, expectedHex, ...extra] = storedHash.split(':');
  if (
    extra.length > 0 ||
    !saltHex ||
    !expectedHex ||
    !/^[a-f0-9]+$/i.test(saltHex) ||
    !/^[a-f0-9]+$/i.test(expectedHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (salt.length === 0 || expected.length !== SCRYPT_KEY_LENGTH) {
    return false;
  }

  try {
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function isLegacySha256PasswordHash(storedHash?: string): boolean {
  return Boolean(storedHash?.startsWith(SHA256_PREFIX));
}

function removePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
