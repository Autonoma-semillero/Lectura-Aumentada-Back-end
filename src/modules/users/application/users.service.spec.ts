import { Test } from '@nestjs/testing';
import { USERS_REPOSITORY } from '../domain/constants/users.tokens';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
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
    expect((list[0] as { password_hash?: string }).password_hash).toBeUndefined();
  });
});
