import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { verifyPassword } from '../../auth/domain/password.util';
import { USERS_REPOSITORY } from '../domain/constants/users.tokens';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findStudentsByIds: jest.fn(),
    searchStudents: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: usersRepository },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('listPublicUsers omite password_hash', async () => {
    const now = new Date();
    usersRepository.findAll.mockResolvedValue([
      {
        id: '1',
        email: 'u@x.com',
        roles: ['student'],
        password_hash: 'secret',
        created_at: now,
        updated_at: now,
      },
    ]);

    const list = await service.listPublicUsers();
    expect(list).toHaveLength(1);
    expect(list[0].email).toBe('u@x.com');
    expect(
      (list[0] as { password_hash?: string }).password_hash,
    ).toBeUndefined();
  });

  it('crea estudiantes con username normalizado y contraseña Argon2', async () => {
    const now = new Date();
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.findByUsername.mockResolvedValue(null);
    usersRepository.create.mockImplementation(
      (payload: Record<string, unknown>) =>
        Promise.resolve({
          id: '1',
          ...payload,
          created_at: now,
          updated_at: now,
        }),
    );

    const created = await service.createPublic({
      email: ' Ana@Example.com ',
      username: ' Ana.Garcia ',
      display_name: 'Ana García',
      password: 'Lectura123!',
      roles: ['student'],
    });

    const payload = usersRepository.create.mock.calls[0][0] as {
      username: string;
      email: string;
      password_hash: string;
    };
    expect(payload.email).toBe('ana@example.com');
    expect(payload.username).toBe('ana.garcia');
    expect(await verifyPassword('Lectura123!', payload.password_hash)).toBe(
      true,
    );
    expect(created.username).toBe('ana.garcia');
    expect(
      (created as { password_hash?: string }).password_hash,
    ).toBeUndefined();
  });

  it('rechaza un username ya registrado', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.findByUsername.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createPublic({
        email: 'ana@example.com',
        username: 'ana',
        password: 'Lectura123!',
        roles: ['teacher'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('propaga offset y limita a cien la paginación de estudiantes', async () => {
    usersRepository.searchStudents.mockResolvedValue([]);

    await service.searchStudents(' Ana ', 250, 100);

    expect(usersRepository.searchStudents).toHaveBeenCalledWith(
      'Ana',
      100,
      100,
    );
  });
});
