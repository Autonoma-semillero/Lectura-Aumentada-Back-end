import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { DomanSessionsService } from '../application/doman-sessions.service';
import { DomanProgressController } from './doman-progress.controller';

describe('DomanProgressController', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const domanSessionsService = {
    getProgressSummary: jest.fn(),
  };
  let controller: DomanProgressController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [DomanProgressController],
      providers: [
        { provide: DomanSessionsService, useValue: domanSessionsService },
      ],
    }).compile();
    controller = moduleRef.get(DomanProgressController);
  });

  it('habilita progreso para estudiante, docente y administrador', () => {
    expect(Reflect.getMetadata(ROLES_KEY, DomanProgressController)).toEqual([
      'student',
      'teacher',
      'admin',
    ]);
  });

  it('delega summary con la identidad autenticada', async () => {
    const request = {
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

    await controller.summary({ student_id: studentId }, request);

    expect(domanSessionsService.getProgressSummary).toHaveBeenCalledWith(
      studentId,
      { userId: studentId, role: 'student' },
    );
  });
});
