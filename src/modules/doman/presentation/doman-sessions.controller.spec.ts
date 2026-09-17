import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { DomanSessionsService } from '../application/doman-sessions.service';
import { DomanSessionsController } from './doman-sessions.controller';

describe('DomanSessionsController', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const categoryId = '507f1f77bcf86cd799439021';
  const sessionId = '507f1f77bcf86cd799439041';
  const domanSessionsService = {
    create: jest.fn(),
    list: jest.fn(),
    getNext: jest.fn(),
    getHistory: jest.fn(),
    getDetailedById: jest.fn(),
    update: jest.fn(),
    start: jest.fn(),
    registerExposure: jest.fn(),
    complete: jest.fn(),
  };

  let controller: DomanSessionsController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [DomanSessionsController],
      providers: [
        { provide: DomanSessionsService, useValue: domanSessionsService },
      ],
    }).compile();
    controller = moduleRef.get(DomanSessionsController);
  });

  it('habilita las rutas de alumno para los tres roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, DomanSessionsController)).toEqual([
      'student',
      'teacher',
      'admin',
    ]);
  });

  it.each(['create', 'update'] as const)(
    'mantiene %s restringido a docentes y administradores',
    (method) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual([
        'teacher',
        'admin',
      ]);
    },
  );

  it('delega next con categoría e identidad autenticada', async () => {
    const query = { student_id: studentId, category_id: categoryId };
    const request = buildStudentRequest();

    await controller.next(query, request);

    expect(domanSessionsService.getNext).toHaveBeenCalledWith(query, {
      userId: studentId,
      role: 'student',
    });
  });

  it('delega lectura y mutaciones de sesión con la identidad autenticada', async () => {
    const request = buildStudentRequest();
    const exposure = { event_type: 'session_finished' as const };
    const completion = {};

    await controller.getOne(sessionId, request);
    await controller.start(sessionId, request);
    await controller.createExposure(sessionId, exposure, request);
    await controller.complete(sessionId, completion, request);

    const requester = { userId: studentId, role: 'student' };
    expect(domanSessionsService.getDetailedById).toHaveBeenCalledWith(
      sessionId,
      requester,
    );
    expect(domanSessionsService.start).toHaveBeenCalledWith(
      sessionId,
      requester,
    );
    expect(domanSessionsService.registerExposure).toHaveBeenCalledWith(
      sessionId,
      exposure,
      requester,
    );
    expect(domanSessionsService.complete).toHaveBeenCalledWith(
      sessionId,
      completion,
      requester,
    );
  });

  function buildStudentRequest() {
    return {
      user: {
        userId: studentId,
        email: 'student@example.test',
        role: 'student' as const,
        jti: 'jwt-id',
      },
    } as Request & {
      user: {
        userId: string;
        email: string;
        role: 'student';
        jti: string;
      };
    };
  }
});
