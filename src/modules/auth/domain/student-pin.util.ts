import { createHmac } from 'crypto';

/**
 * Creates a deterministic, keyed lookup for a student PIN. The PIN itself is
 * still verified against its Argon2 hash; this value only lets us find the
 * matching student without exposing names or scanning every account.
 */
export function createStudentPinLookup(pin: string): string {
  const pepper = process.env.STUDENT_PIN_PEPPER?.trim() || process.env.JWT_SECRET?.trim();
  if (!pepper) {
    throw new Error('STUDENT_PIN_PEPPER or JWT_SECRET must be configured');
  }

  return createHmac('sha256', pepper).update(pin).digest('hex');
}
