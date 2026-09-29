import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function context(role?: 'student' | 'teacher' | 'admin') {
    return {
      getHandler: () => 'handler', getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    } as never;
  }

  it('allows endpoints without roles and users holding an accepted role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(['teacher']) };
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(context())).toBe(true);
    expect(guard.canActivate(context('teacher'))).toBe(true);
  });

  it('rejects missing identities and roles outside the endpoint contract', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['teacher']) };
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context('student'))).toThrow('Insufficient permissions');
  });
});
