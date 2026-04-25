import { createHash, timingSafeEqual } from 'crypto';

const SHA256_PREFIX = 'sha256:';
const PLAIN_PREFIX = 'plain:';

export function hashPassword(password: string): string {
  return `${SHA256_PREFIX}${createHash('sha256').update(password).digest('hex')}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || storedHash.trim().length === 0) {
    return false;
  }

  if (storedHash.startsWith(SHA256_PREFIX)) {
    const expected = Buffer.from(removePrefix(storedHash, SHA256_PREFIX), 'hex');
    const actual = Buffer.from(
      createHash('sha256').update(password).digest('hex'),
      'hex',
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  if (storedHash.startsWith(PLAIN_PREFIX)) {
    return removePrefix(storedHash, PLAIN_PREFIX) === password;
  }

  return storedHash === password;
}

function removePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
