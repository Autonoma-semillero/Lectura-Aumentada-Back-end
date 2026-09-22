import { scrypt as nodeScrypt } from 'crypto';
import { promisify } from 'util';
import { verifyPassword } from './password.util';

const scrypt = promisify(nodeScrypt);

describe('password utilities', () => {
  it('verifies the portable scrypt fallback format', async () => {
    const password = 'Lectura123!';
    const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const storedHash = `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;

    await expect(verifyPassword(password, storedHash)).resolves.toBe(true);
    await expect(verifyPassword('incorrecta', storedHash)).resolves.toBe(false);
  });

  it('rejects malformed scrypt hashes', async () => {
    await expect(verifyPassword('clave', 'scrypt:not-hex:value')).resolves.toBe(
      false,
    );
  });
});
