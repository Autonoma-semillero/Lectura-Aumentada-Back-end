import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { MarkersService } from '../application/markers.service';
import { MarkersController } from './markers.controller';

describe('MarkersController', () => {
  const markersService = {
    list: jest.fn(),
    getById: jest.fn(),
    getByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setModel: jest.fn(),
    removeModel: jest.fn(),
    archive: jest.fn(),
  };

  let controller: MarkersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [MarkersController],
      providers: [{ provide: MarkersService, useValue: markersService }],
    }).compile();
    controller = moduleRef.get(MarkersController);
  });

  it.each(['create', 'update', 'setModel', 'removeModel', 'archive'] as const)(
    'restringe %s a docentes y administradores',
    (method) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual([
        'teacher',
        'admin',
      ]);
    },
  );

  it.each(['list', 'getById', 'getByCode'] as const)(
    'deja %s abierto a cualquier usuario autenticado',
    (method) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toBeUndefined();
    },
  );

  it('deriva el autor del marcador de la identidad del JWT', async () => {
    const dto = { code: 'aula3-gato', name: 'Marcador Gato' };
    const request = {
      user: {
        userId: '507f1f77bcf86cd799439021',
        email: 'teacher@example.test',
        role: 'teacher' as const,
        jti: 'jwt-id',
      },
    } as Request & { user: AuthRequestUser };
    const expected = { id: '507f1f77bcf86cd799439011' };
    markersService.create.mockResolvedValue(expected);

    await expect(controller.create(dto, request)).resolves.toBe(expected);
    expect(markersService.create).toHaveBeenCalledWith(
      dto,
      '507f1f77bcf86cd799439021',
    );
  });
});
