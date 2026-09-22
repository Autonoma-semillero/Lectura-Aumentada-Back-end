import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { StudyPlansService } from '../application/study-plans.service';
import { StudyPlansController } from './study-plans.controller';

describe('StudyPlansController', () => {
  const studyPlansService = {
    list: jest.fn(),
    getActiveConfiguration: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    generateDay: jest.fn(),
    archive: jest.fn(),
    previewCategoryCards: jest.fn(),
  };
  let controller: StudyPlansController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [StudyPlansController],
      providers: [{ provide: StudyPlansService, useValue: studyPlansService }],
    }).compile();
    controller = moduleRef.get(StudyPlansController);
  });

  it('restringe la previsualización a docentes y administradores heredando el guard de clase', () => {
    expect(Reflect.getMetadata(ROLES_KEY, StudyPlansController)).toEqual([
      'teacher',
      'admin',
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, controller.previewCategoryCards),
    ).toBeUndefined();
  });

  it('permite a estudiantes listar sus propios planes vía override de rol en el método', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.list)).toEqual([
      'student',
      'teacher',
      'admin',
    ]);
  });

  it('delega la previsualización con la identidad autenticada por JWT', async () => {
    const dto = {
      category_id: '507f1f77bcf86cd799439021',
      word_card_words: ['gato'],
      student_ids: ['507f1f77bcf86cd799439011'],
    };
    const request = buildTeacherRequest('507f1f77bcf86cd799439061');
    const expected = { students: [] };
    studyPlansService.previewCategoryCards.mockResolvedValue(expected);

    await expect(
      controller.previewCategoryCards(dto, request),
    ).resolves.toBe(expected);
    expect(studyPlansService.previewCategoryCards).toHaveBeenCalledWith(dto, {
      userId: '507f1f77bcf86cd799439061',
      role: 'teacher',
    });
  });

  function buildTeacherRequest(userId: string) {
    return {
      user: {
        userId,
        email: 'teacher@example.test',
        role: 'teacher' as const,
        jti: 'jwt-id',
      },
    } as Request & {
      user: {
        userId: string;
        email: string;
        role: 'teacher';
        jti: string;
      };
    };
  }
});
