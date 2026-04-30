import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUTH_REPOSITORY } from '../domain/constants/auth.tokens';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authRepository = {
    validateUser: jest.fn(),
    issueTokens: jest.fn(),
    createSession: jest.fn(),
    revokeSessionByAccessJti: jest.fn(),
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_REPOSITORY, useValue: authRepository },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('login lanza UnauthorizedException si las credenciales no son válidas', async () => {
    authRepository.validateUser.mockResolvedValue(null);
    await expect(
      service.login({ email: 'no@existe.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login emite tokens y crea sesión cuando el usuario es válido', async () => {
    authRepository.validateUser.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'a@b.com',
      roles: ['student'],
    });
    authRepository.issueTokens.mockResolvedValue({ accessToken: 'signed.jwt' });
    authRepository.createSession.mockResolvedValue(undefined);

    const result = await service.login({ email: 'a@b.com', password: 'secret' });

    expect(result.accessToken).toBe('signed.jwt');
    expect(result.user.email).toBe('a@b.com');
    expect(authRepository.createSession).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'signed.jwt',
    );
  });

  it('logout delega en revokeSessionByAccessJti', async () => {
    authRepository.revokeSessionByAccessJti.mockResolvedValue(undefined);
    await service.logout('jti-1');
    expect(authRepository.revokeSessionByAccessJti).toHaveBeenCalledWith('jti-1');
  });
});
