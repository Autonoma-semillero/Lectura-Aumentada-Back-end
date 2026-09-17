import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoServerError } from 'mongodb';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { DailyPlansService } from './daily-plans.service';

describe('DailyPlansService', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const otherCategoryId = '507f1f77bcf86cd799439022';
  const planId = '507f1f77bcf86cd799439031';
  const sessionId = '507f1f77bcf86cd799439041';
  const now = new Date('2026-09-08T04:59:59.999Z');
  const studentRequester = {
    userId: studentId,
    role: 'student' as const,
  };
  const teacherRequester = {
    userId: otherStudentId,
    role: 'teacher' as const,
  };

  const dailyPlansRepository = {
    findByStudentAndDateRange: jest.fn(),
    findById: jest.fn(),
    findByStudentAndPlanDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const sessionsRepository = {
    findByDailyPlanId: jest.fn(),
    deleteByDailyPlanId: jest.fn(),
    create: jest.fn(),
  };
  const sessionCardsRepository = {
    deleteBySessionIds: jest.fn(),
    createMany: jest.fn(),
  };
  const wordCardsRepository = {
    countWordCardsByCategoryForStudent: jest.fn(),
    listByStudentCategoryAndStatuses: jest.fn(),
  };
  const categoriesService = {
    findById: jest.fn(),
  };
  const studyPlansRepository = {
    findById: jest.fn(),
    findActiveForStudentAndDate: jest.fn(),
  };

  let service: DailyPlansService;

  beforeEach(async () => {
    jest.resetAllMocks();
    studyPlansRepository.findActiveForStudentAndDate.mockResolvedValue(null);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DailyPlansService,
        { provide: DAILY_PLANS_REPOSITORY, useValue: dailyPlansRepository },
        { provide: DOMAN_SESSIONS_REPOSITORY, useValue: sessionsRepository },
        {
          provide: DOMAN_SESSION_CARDS_REPOSITORY,
          useValue: sessionCardsRepository,
        },
        { provide: WORD_CARDS_REPOSITORY, useValue: wordCardsRepository },
        { provide: STUDY_PLANS_REPOSITORY, useValue: studyPlansRepository },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();
    service = moduleRef.get(DailyPlansService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('list rechaza student_id inválido', async () => {
    await expect(
      service.list(
        {
          student_id: 'invalid',
          from: '2026-01-01',
          to: '2026-01-31',
        },
        teacherRequester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impide que un estudiante liste planes de otro usuario', async () => {
    await expect(
      service.list(
        {
          student_id: otherStudentId,
          from: '2026-01-01',
          to: '2026-01-31',
        },
        studentRequester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      dailyPlansRepository.findByStudentAndDateRange,
    ).not.toHaveBeenCalled();
  });

  it('impide que un estudiante lea por id el plan de otro usuario', async () => {
    dailyPlansRepository.findById.mockResolvedValue(buildPlan(otherStudentId));

    await expect(
      service.getById(planId, studentRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('normaliza ObjectIds al validar que el estudiante accede a su plan', async () => {
    dailyPlansRepository.findById.mockResolvedValue(buildPlan(studentId));

    await expect(
      service.getById(planId, {
        userId: studentId.toUpperCase(),
        role: 'student',
      }),
    ).resolves.toMatchObject({ student_id: studentId });
  });

  it('permite que un estudiante genere su propio plan', async () => {
    jest.useFakeTimers().setSystemTime(now);
    prepareSuccessfulGeneration(studentId);

    await expect(
      service.generate(
        {
          student_id: studentId,
          category_id: categoryId,
          target_cards_count: 3,
          target_sessions_count: 1,
        },
        studentRequester,
      ),
    ).resolves.toMatchObject({
      cards_count: 3,
      sessions_count: 1,
      next_session_id: sessionId,
    });
    expect(dailyPlansRepository.findByStudentAndPlanDate).toHaveBeenCalledWith(
      studentId,
      new Date('2026-09-07T00:00:00.000Z'),
      categoryId,
    );
  });

  it('impide que un estudiante genere el plan de otro usuario', async () => {
    await expect(
      service.generate({ student_id: otherStudentId }, studentRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      dailyPlansRepository.findByStudentAndPlanDate,
    ).not.toHaveBeenCalled();
    expect(dailyPlansRepository.create).not.toHaveBeenCalled();
  });

  it.each(['teacher', 'admin'] as const)(
    'permite que un %s genere el plan de un estudiante',
    async (role) => {
      prepareSuccessfulGeneration(otherStudentId);

      await expect(
        service.generate(
          {
            student_id: otherStudentId,
            category_id: categoryId,
            target_cards_count: 3,
            target_sessions_count: 1,
          },
          { userId: studentId, role },
        ),
      ).resolves.toMatchObject({ next_session_id: sessionId });
    },
  );

  it('resuelve de forma determinista la categoría omitida y usa el día de Bogotá', async () => {
    jest.useFakeTimers().setSystemTime(now);
    wordCardsRepository.countWordCardsByCategoryForStudent.mockResolvedValue([
      { categoryId: otherCategoryId, count: 3 },
      { categoryId, count: 3 },
    ]);
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(
      buildPlan(studentId),
    );
    sessionsRepository.findByDailyPlanId.mockResolvedValue([
      buildSession(studentId),
    ]);
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(studentId),
    );

    await service.getToday(studentId, undefined, studentRequester);

    expect(dailyPlansRepository.findByStudentAndPlanDate).toHaveBeenCalledWith(
      studentId,
      new Date('2026-09-07T00:00:00.000Z'),
      categoryId,
    );
  });

  it('respeta un día cuyas sesiones fueron eliminadas por el docente', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const plan = buildPlan(studentId);
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(plan);
    sessionsRepository.findByDailyPlanId.mockResolvedValue([]);
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(studentId),
    );

    await expect(
      service.getToday(studentId, categoryId, studentRequester),
    ).resolves.toMatchObject({
      sessions_count: 0,
      pending_sessions_count: 0,
      next_session_id: null,
    });
    expect(sessionsRepository.create).not.toHaveBeenCalled();
  });

  it('crea un plan separado cuando ya existe otra categoría ese día', async () => {
    const otherPlan = buildPlan(studentId, otherCategoryId);
    const requestedPlan = buildPlan(studentId, categoryId);
    categoriesService.findById.mockResolvedValue({ id: categoryId });
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(studentId),
    );
    dailyPlansRepository.findByStudentAndPlanDate.mockImplementation(
      async (_studentId: string, _date: Date, requestedCategoryId: string) =>
        requestedCategoryId === otherCategoryId ? otherPlan : null,
    );
    dailyPlansRepository.create.mockResolvedValue(requestedPlan);
    sessionsRepository.create.mockResolvedValue(buildSession(studentId));

    await service.generate(
      {
        student_id: studentId,
        category_id: categoryId,
        target_cards_count: 3,
        target_sessions_count: 1,
      },
      studentRequester,
    );

    expect(dailyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId }),
    );
  });

  it('traduce una carrera E11000 durante generate a ConflictException', async () => {
    categoriesService.findById.mockResolvedValue({ id: categoryId });
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(studentId),
    );
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(null);
    dailyPlansRepository.create.mockRejectedValue(
      new MongoServerError({ message: 'duplicate', code: 11000 }),
    );

    await expect(
      service.generate(
        { student_id: studentId, category_id: categoryId },
        studentRequester,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('limpia el plan nuevo, sus sesiones y tarjetas si falla la generación', async () => {
    const plan = buildPlan(studentId);
    const session = buildSession(studentId);
    categoriesService.findById.mockResolvedValue({ id: categoryId });
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(studentId),
    );
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(null);
    dailyPlansRepository.create.mockResolvedValue(plan);
    sessionsRepository.create.mockResolvedValue(session);
    sessionCardsRepository.createMany.mockRejectedValue(
      new Error('session cards insert failed'),
    );
    sessionsRepository.findByDailyPlanId.mockResolvedValue([session]);
    sessionCardsRepository.deleteBySessionIds.mockResolvedValue(undefined);
    sessionsRepository.deleteByDailyPlanId.mockResolvedValue(undefined);
    dailyPlansRepository.delete.mockResolvedValue(true);

    await expect(
      service.generate(
        {
          student_id: studentId,
          category_id: categoryId,
          target_cards_count: 3,
          target_sessions_count: 1,
        },
        studentRequester,
      ),
    ).rejects.toThrow('session cards insert failed');

    expect(sessionCardsRepository.deleteBySessionIds).toHaveBeenCalledWith([
      sessionId,
    ]);
    expect(sessionsRepository.deleteByDailyPlanId).toHaveBeenCalledWith(planId);
    expect(dailyPlansRepository.delete).toHaveBeenCalledWith(planId);
    expect(
      sessionCardsRepository.deleteBySessionIds.mock.invocationCallOrder[0],
    ).toBeLessThan(
      sessionsRepository.deleteByDailyPlanId.mock.invocationCallOrder[0],
    );
    expect(
      sessionsRepository.deleteByDailyPlanId.mock.invocationCallOrder[0],
    ).toBeLessThan(dailyPlansRepository.delete.mock.invocationCallOrder[0]);
  });

  it('impide cambiar la categoría de un plan que ya tiene sesiones', async () => {
    dailyPlansRepository.findById.mockResolvedValue(buildPlan(studentId));
    categoriesService.findById.mockResolvedValue({ id: otherCategoryId });
    sessionsRepository.findByDailyPlanId.mockResolvedValue([
      buildSession(studentId),
    ]);

    await expect(
      service.update(
        planId,
        { category_id: otherCategoryId },
        teacherRequester,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dailyPlansRepository.update).not.toHaveBeenCalled();
  });

  function prepareSuccessfulGeneration(
    targetStudentId: string,
    selectedCategoryId = categoryId,
  ): void {
    const plan = buildPlan(targetStudentId, selectedCategoryId);
    categoriesService.findById.mockResolvedValue({ id: selectedCategoryId });
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
      buildCards(targetStudentId, selectedCategoryId),
    );
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(null);
    dailyPlansRepository.create.mockResolvedValue(plan);
    sessionsRepository.create.mockResolvedValue(
      buildSession(targetStudentId, selectedCategoryId),
    );
    sessionCardsRepository.createMany.mockResolvedValue(undefined);
  }

  function buildPlan(targetStudentId: string, selectedCategoryId = categoryId) {
    return {
      id: planId,
      student_id: targetStudentId,
      plan_date: new Date('2026-09-07T00:00:00.000Z'),
      target_cards_count: 3,
      target_sessions_count: 1,
      category_id: selectedCategoryId,
      created_at: now,
      updated_at: now,
    };
  }

  function buildSession(
    targetStudentId: string,
    selectedCategoryId = categoryId,
  ) {
    return {
      id: sessionId,
      student_id: targetStudentId,
      daily_plan_id: planId,
      session_index: 1,
      category_id: selectedCategoryId,
      display_ms: 2200,
      audio_mode: 'manual' as const,
      status: 'planned' as const,
      mode: 'auto' as const,
      created_at: now,
      updated_at: now,
    };
  }

  function buildCards(
    targetStudentId: string,
    selectedCategoryId = categoryId,
  ) {
    return ['gato', 'perro', 'árbol'].map((word, index) => ({
      id: `507f1f77bcf86cd79943905${index}`,
      student_id: targetStudentId,
      word,
      status: 'active',
      category_id: selectedCategoryId,
      initial_letter: word[0],
      times_shown: index,
      created_at: now,
      updated_at: now,
    }));
  }
});
