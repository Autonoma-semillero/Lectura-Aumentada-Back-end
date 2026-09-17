import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { DailyPlansService } from '../application/daily-plans.service';
import { DailyPlansController } from './daily-plans.controller';

describe('DailyPlansController', () => {
  const dailyPlansService = {
    create: jest.fn(),
    generate: jest.fn(),
    list: jest.fn(),
    getToday: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let controller: DailyPlansController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [DailyPlansController],
      providers: [{ provide: DailyPlansService, useValue: dailyPlansService }],
    }).compile();
    controller = moduleRef.get(DailyPlansController);
  });

  it('habilita generate para estudiantes, docentes y administradores', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.generate)).toEqual([
      'student',
      'teacher',
      'admin',
    ]);
  });

  it.each(['list', 'getOne'] as const)(
    'habilita %s para estudiantes, docentes y administradores',
    (method) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual([
        'student',
        'teacher',
        'admin',
      ]);
    },
  );

  it('delega generate con la identidad autenticada por JWT', async () => {
    const dto = { student_id: '507f1f77bcf86cd799439011' };
    const request = {
      user: {
        userId: dto.student_id,
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
    const expected = { next_session_id: 'session-id' };
    dailyPlansService.generate.mockResolvedValue(expected);

    await expect(controller.generate(dto, request)).resolves.toBe(expected);
    expect(dailyPlansService.generate).toHaveBeenCalledWith(dto, {
      userId: dto.student_id,
      role: 'student',
    });
  });

  it('delega today con categoría opcional e identidad autenticada', async () => {
    const query = {
      student_id: '507f1f77bcf86cd799439011',
      category_id: '507f1f77bcf86cd799439021',
    };
    const request = {
      user: {
        userId: query.student_id,
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
    dailyPlansService.getToday.mockResolvedValue({ plan: {} });

    await controller.today(query, request);

    expect(dailyPlansService.getToday).toHaveBeenCalledWith(query.student_id, query.category_id, {
      userId: query.student_id,
      role: 'student',
    });
  });

  it('delega list y getOne con la identidad autenticada', async () => {
    const studentId = '507f1f77bcf86cd799439011';
    const request = buildStudentRequest(studentId);
    const query = { student_id: studentId };

    await controller.list(query, request);
    await controller.getOne('507f1f77bcf86cd799439031', request);

    expect(dailyPlansService.list).toHaveBeenCalledWith(query, {
      userId: studentId,
      role: 'student',
    });
    expect(dailyPlansService.getById).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439031',
      { userId: studentId, role: 'student' },
    );
  });

  function buildStudentRequest(studentId: string) {
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
