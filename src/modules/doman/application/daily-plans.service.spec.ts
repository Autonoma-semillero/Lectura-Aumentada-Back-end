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
    restore: jest.fn(),
    delete: jest.fn(),
  };
  const sessionsRepository = {
    findByDailyPlanId: jest.fn(),
    deleteByDailyPlanId: jest.fn(),
    restoreMany: jest.fn(),
    create: jest.fn(),
  };
  const sessionCardsRepository = {
    listBySessionId: jest.fn(),
    deleteBySessionIds: jest.fn(),
    restoreMany: jest.fn(),
    createMany: jest.fn(),
  };
  const wordCardsRepository = {
    countWordCardsByCategoryForStudent: jest.fn(),
    findByIds: jest.fn(),
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
    sessionCardsRepository.listBySessionId.mockResolvedValue([]);
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

  it('getToday usa las tarjetas persistidas aunque cambie la selección dinámica', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const plan = { ...buildPlan(studentId), target_cards_count: 2 };
    const persistedCards = buildCards(studentId).slice(0, 2);
    studyPlansRepository.findActiveForStudentAndDate.mockResolvedValue(
      buildStudyPlan([studentId], {
        category_id: categoryId,
        target_cards_count: 3,
      }),
    );
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(plan);
    sessionsRepository.findByDailyPlanId.mockResolvedValue([
      buildSession(studentId),
    ]);
    sessionCardsRepository.listBySessionId.mockResolvedValue(
      buildPersistedSessionCards(persistedCards),
    );
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([
      {
        ...buildCards(studentId)[2],
        word: 'selección nueva',
      },
    ]);

    await expect(
      service.getToday(studentId, categoryId, studentRequester),
    ).resolves.toMatchObject({
      cards_count: 2,
      cards: persistedCards.map((card) => ({
        id: card.id,
        word: card.word,
        status: card.status,
      })),
    });
    expect(sessionCardsRepository.listBySessionId).toHaveBeenCalledWith(
      sessionId,
    );
    expect(
      wordCardsRepository.listByStudentCategoryAndStatuses,
    ).not.toHaveBeenCalled();
  });

  it('generate sin force reutiliza las tarjetas persistidas aunque ya no haya elegibles', async () => {
    const existing = { ...buildPlan(studentId), target_cards_count: 2 };
    const persistedCards = buildCards(studentId).slice(0, 2);
    studyPlansRepository.findById.mockResolvedValue(
      buildStudyPlan([studentId], {
        category_id: categoryId,
        target_cards_count: 3,
      }),
    );
    categoriesService.findById.mockResolvedValue({ id: categoryId });
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(existing);
    sessionsRepository.findByDailyPlanId.mockResolvedValue([
      buildSession(studentId),
    ]);
    sessionCardsRepository.listBySessionId.mockResolvedValue(
      buildPersistedSessionCards(persistedCards),
    );
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([]);

    await expect(
      service.generateForAssignment(
        {
          student_id: studentId,
          study_plan_id: '507f1f77bcf86cd799439099',
          category_id: categoryId,
          plan_date: '2026-09-20',
          force: false,
        },
        teacherRequester,
      ),
    ).resolves.toMatchObject({
      status: 'existing',
      plan: {
        cards_count: 2,
        cards: persistedCards.map((card) => ({
          id: card.id,
          word: card.word,
          status: card.status,
        })),
      },
    });
    expect(
      wordCardsRepository.listByStudentCategoryAndStatuses,
    ).not.toHaveBeenCalled();
    expect(dailyPlansRepository.update).not.toHaveBeenCalled();
    expect(sessionsRepository.deleteByDailyPlanId).not.toHaveBeenCalled();
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

  it('resuelve una regla v2 con las tarjetas propias del estudiante', async () => {
    prepareSuccessfulGeneration(studentId);
    studyPlansRepository.findById.mockResolvedValue(
      buildStudyPlan([studentId], {
        category_id: categoryId,
        target_cards_count: 2,
      }),
    );

    await service.generate(
      {
        student_id: studentId,
        study_plan_id: '507f1f77bcf86cd799439099',
        category_id: categoryId,
        plan_date: '2026-09-20',
      },
      teacherRequester,
    );

    expect(
      wordCardsRepository.listByStudentCategoryAndStatuses,
    ).toHaveBeenCalledWith(studentId, categoryId, ['new', 'active']);
    expect(dailyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId,
        targetCardsCount: 2,
        algorithmVersion: 'doman-study-plan-v2',
      }),
    );
  });

  it('conserva la selección exacta de tarjetas de un plan legacy', async () => {
    prepareSuccessfulGeneration(studentId);
    const cards = buildCards(studentId).slice(0, 2);
    wordCardsRepository.findByIds.mockResolvedValue(cards);
    studyPlansRepository.findById.mockResolvedValue(
      buildStudyPlan(
        [studentId],
        {
          category_id: categoryId,
          word_card_ids: cards.map((card) => card.id),
        },
        1,
      ),
    );

    await service.generate(
      {
        student_id: studentId,
        study_plan_id: '507f1f77bcf86cd799439099',
        category_id: categoryId,
        plan_date: '2026-09-20',
      },
      teacherRequester,
    );

    expect(wordCardsRepository.findByIds).toHaveBeenCalledWith(
      cards.map((card) => card.id),
    );
    expect(dailyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        targetCardsCount: 2,
        algorithmVersion: 'doman-study-plan-v1',
      }),
    );
  });

  it('rechaza un plan lógico que no incluye al estudiante', async () => {
    studyPlansRepository.findById.mockResolvedValue(
      buildStudyPlan([otherStudentId], {
        category_id: categoryId,
        target_cards_count: 2,
      }),
    );

    await expect(
      service.generate(
        {
          student_id: studentId,
          study_plan_id: '507f1f77bcf86cd799439099',
          category_id: categoryId,
          plan_date: '2026-09-20',
        },
        teacherRequester,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dailyPlansRepository.create).not.toHaveBeenCalled();
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

  it('reporta cards_count 0 cuando no hay tarjetas resueltas, sin inventar el target', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const plan = buildPlan(studentId); // target_cards_count: 3
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(plan);
    sessionsRepository.findByDailyPlanId.mockResolvedValue([
      buildSession(studentId),
    ]);
    // Las sesiones existen pero ninguna tarjeta puente resuelve.
    sessionCardsRepository.listBySessionId.mockResolvedValue([]);

    const summary = await service.getToday(
      studentId,
      categoryId,
      studentRequester,
    );

    // Antes devolvía cards_count: 3 junto a cards: [].
    expect(summary.cards).toEqual([]);
    expect(summary.cards_count).toBe(0);
    // La intención guardada sigue disponible en el propio plan.
    expect(summary.plan.target_cards_count).toBe(3);
  });

  describe('compensación de una regeneración con force', () => {
    /**
     * Prepara un plan existente con una sesión y sus tarjetas persistidas, de
     * modo que `force: true` entre por la rama destructiva.
     */
    function primeForcedRegeneration(): {
      existingPlan: ReturnType<typeof buildPlan>;
      existingSession: ReturnType<typeof buildSession>;
      persistedCards: ReturnType<typeof buildPersistedSessionCards>;
    } {
      const existingPlan = buildPlan(studentId);
      const existingSession = buildSession(studentId);
      const persistedCards = buildPersistedSessionCards(buildCards(studentId));

      categoriesService.findById.mockResolvedValue({ id: categoryId });
      wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
        buildCards(studentId),
      );
      dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(
        existingPlan,
      );
      sessionsRepository.findByDailyPlanId.mockResolvedValue([existingSession]);
      sessionCardsRepository.listBySessionId.mockResolvedValue(persistedCards);
      sessionCardsRepository.deleteBySessionIds.mockResolvedValue(undefined);
      sessionsRepository.deleteByDailyPlanId.mockResolvedValue(undefined);
      dailyPlansRepository.update.mockResolvedValue(existingPlan);

      return { existingPlan, existingSession, persistedCards };
    }

    it('restaura el plan, las sesiones y las tarjetas cuando falla la creación de sesiones', async () => {
      const { existingPlan, existingSession, persistedCards } =
        primeForcedRegeneration();
      sessionsRepository.create.mockRejectedValue(
        new Error('session insert timed out'),
      );

      await expect(
        service.generate(
          { student_id: studentId, category_id: categoryId, force: true },
          teacherRequester,
        ),
      ).rejects.toThrow('session insert timed out');

      // Las sesiones originales vuelven con su _id, para que las filas puente
      // restauradas sigan resolviendo.
      expect(sessionsRepository.restoreMany).toHaveBeenCalledWith([
        existingSession,
      ]);
      // Las filas puente se reinsertan sin la tarjeta expandida por $lookup.
      expect(sessionCardsRepository.restoreMany).toHaveBeenCalledWith(
        persistedCards.map(({ word_card: _ignored, ...row }) => row),
      );
      expect(dailyPlansRepository.restore).toHaveBeenCalledWith(existingPlan);
      // Un plan preexistente nunca se borra al compensar.
      expect(dailyPlansRepository.delete).not.toHaveBeenCalled();
    });

    it('compensa también cuando falla el update del plan, antes de crear sesiones', async () => {
      const { existingPlan, existingSession } = primeForcedRegeneration();
      dailyPlansRepository.update.mockRejectedValue(
        new Error('plan update failed'),
      );

      await expect(
        service.generate(
          { student_id: studentId, category_id: categoryId, force: true },
          teacherRequester,
        ),
      ).rejects.toThrow('plan update failed');

      expect(sessionsRepository.restoreMany).toHaveBeenCalledWith([
        existingSession,
      ]);
      expect(dailyPlansRepository.restore).toHaveBeenCalledWith(existingPlan);
      expect(sessionsRepository.create).not.toHaveBeenCalled();
    });

    it('propaga el error original aunque la compensación falle', async () => {
      primeForcedRegeneration();
      sessionsRepository.create.mockRejectedValue(
        new Error('session insert timed out'),
      );
      sessionsRepository.restoreMany.mockRejectedValue(
        new Error('restore also failed'),
      );

      await expect(
        service.generate(
          { student_id: studentId, category_id: categoryId, force: true },
          teacherRequester,
        ),
      ).rejects.toThrow('session insert timed out');
    });

    it('borra el plan recién creado cuando la generación falla sin plan previo', async () => {
      prepareSuccessfulGeneration(studentId);
      sessionsRepository.create.mockRejectedValue(new Error('boom'));
      sessionsRepository.findByDailyPlanId.mockResolvedValue([]);

      await expect(
        service.generate(
          { student_id: studentId, category_id: categoryId },
          teacherRequester,
        ),
      ).rejects.toThrow('boom');

      expect(dailyPlansRepository.delete).toHaveBeenCalledWith(planId);
      expect(dailyPlansRepository.restore).not.toHaveBeenCalled();
    });
  });

  it('resuelve la categoría del plan de estudio ignorando el case del ObjectId', async () => {
    const studyPlan = buildStudyPlan([studentId], {
      category_id: categoryId,
      target_cards_count: 3,
    });
    studyPlansRepository.findActiveForStudentAndDate.mockResolvedValue(
      studyPlan,
    );
    prepareSuccessfulGeneration(studentId);

    // `@IsMongoId()` acepta hex en mayúsculas, pero el repositorio devuelve
    // siempre minúsculas: con `===` esto devolvía un 404 falso.
    await expect(
      service.generate(
        {
          student_id: studentId,
          category_id: categoryId.toUpperCase(),
        },
        teacherRequester,
      ),
    ).resolves.toMatchObject({ plan: { id: planId } });
  });

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

  function buildStudyPlan(
    studentIds: string[],
    category:
      | { category_id: string; target_cards_count: number }
      | { category_id: string; word_card_ids: string[] },
    schemaVersion = 2,
  ) {
    return {
      id: '507f1f77bcf86cd799439099',
      name: 'Plan de audiencia',
      group_ids: [],
      direct_student_ids: studentIds,
      student_ids: studentIds,
      students: studentIds.map((targetStudentId) => ({
        student_id: targetStudentId,
        sources: [{ type: 'direct' as const }],
      })),
      schema_version: schemaVersion,
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      end_date: new Date('2026-11-30T00:00:00.000Z'),
      sessions_per_day: 5,
      display_ms: 2200,
      audio_mode: 'manual' as const,
      mode: 'auto' as const,
      status: 'active' as const,
      levels: [
        {
          id: '507f1f77bcf86cd799439098',
          name: 'Nivel 1',
          order_index: 1,
          start_date: new Date('2026-09-01T00:00:00.000Z'),
          end_date: new Date('2026-11-30T00:00:00.000Z'),
          categories: [category],
        },
      ],
      created_by: teacherRequester.userId,
      created_at: now,
      updated_at: now,
    };
  }

  function buildPersistedSessionCards(cards: ReturnType<typeof buildCards>) {
    return cards.map((card, index) => ({
      id: `507f1f77bcf86cd79943908${index}`,
      session_id: sessionId,
      word_card_id: card.id,
      order_index: index,
      created_at: now,
      word_card: card,
    }));
  }
});
