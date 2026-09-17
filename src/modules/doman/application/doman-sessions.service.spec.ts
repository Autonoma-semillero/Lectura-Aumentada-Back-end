import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_EXPOSURE_LOGS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { DomanSessionsService } from './doman-sessions.service';

describe('DomanSessionsService', () => {
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
    findById: jest.fn(),
    findByStudentAndPlanDate: jest.fn(),
    update: jest.fn(),
  };
  const sessionsRepository = {
    findById: jest.fn(),
    findByDailyPlanId: jest.fn(),
    findByStudentAndStatuses: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    restoreByIds: jest.fn(),
    deleteById: jest.fn(),
    deleteByDailyPlanId: jest.fn(),
  };
  const sessionCardsRepository = {
    listBySessionId: jest.fn(),
    findBySessionIdAndWordCardId: jest.fn(),
    touchDisplayedAt: jest.fn(),
    touchAudioPlayedAt: jest.fn(),
    createMany: jest.fn(),
    resetBySessionIds: jest.fn(),
    deleteBySessionIds: jest.fn(),
  };
  const exposureLogsRepository = {
    listByStudent: jest.fn(),
    countByWordCardAndType: jest.fn(),
    create: jest.fn(),
    deleteBySessionIds: jest.fn(),
  };
  const wordCardsRepository = {
    countWordCardsByCategoryForStudent: jest.fn(),
    listByStudentId: jest.fn(),
    findById: jest.fn(),
    applyExposure: jest.fn(),
    listByStudentCategoryAndStatuses: jest.fn(),
    findByIds: jest.fn(),
  };
  const studyPlansRepository = {
    findById: jest.fn(),
  };

  let service: DomanSessionsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DomanSessionsService,
        { provide: DOMAN_SESSIONS_REPOSITORY, useValue: sessionsRepository },
        { provide: DAILY_PLANS_REPOSITORY, useValue: dailyPlansRepository },
        {
          provide: DOMAN_SESSION_CARDS_REPOSITORY,
          useValue: sessionCardsRepository,
        },
        {
          provide: DOMAN_EXPOSURE_LOGS_REPOSITORY,
          useValue: exposureLogsRepository,
        },
        { provide: WORD_CARDS_REPOSITORY, useValue: wordCardsRepository },
        { provide: STUDY_PLANS_REPOSITORY, useValue: studyPlansRepository },
      ],
    }).compile();
    service = moduleRef.get(DomanSessionsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('busca la siguiente sesión usando categoría y día calendario de Bogotá', async () => {
    jest.useFakeTimers().setSystemTime(now);
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(null);

    await expect(
      service.getNext(
        { student_id: studentId, category_id: categoryId },
        studentRequester,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dailyPlansRepository.findByStudentAndPlanDate).toHaveBeenCalledWith(
      studentId,
      new Date('2026-09-07T00:00:00.000Z'),
      categoryId,
    );
  });

  it('resuelve una categoría omitida de forma determinista antes de buscar', async () => {
    wordCardsRepository.countWordCardsByCategoryForStudent.mockResolvedValue([
      { categoryId: otherCategoryId, count: 4 },
      { categoryId, count: 4 },
    ]);
    dailyPlansRepository.findByStudentAndPlanDate.mockResolvedValue(buildPlan());
    sessionsRepository.findByDailyPlanId.mockResolvedValue([buildSession()]);
    sessionCardsRepository.listBySessionId.mockResolvedValue([]);

    await service.getNext({ student_id: studentId }, studentRequester);

    expect(dailyPlansRepository.findByStudentAndPlanDate).toHaveBeenCalledWith(
      studentId,
      expect.any(Date),
      categoryId,
    );
  });

  it('impide que un estudiante consulte la siguiente sesión de otro usuario', async () => {
    await expect(
      service.getNext(
        { student_id: otherStudentId, category_id: categoryId },
        studentRequester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dailyPlansRepository.findByStudentAndPlanDate).not.toHaveBeenCalled();
  });

  it('impide que un estudiante liste sesiones de un plan ajeno', async () => {
    dailyPlansRepository.findById.mockResolvedValue(buildPlan(otherStudentId));

    await expect(
      service.list({ daily_plan_id: planId }, studentRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessionsRepository.findByDailyPlanId).not.toHaveBeenCalled();
  });

  it('impide iniciar una sesión de otro estudiante', async () => {
    sessionsRepository.findById.mockResolvedValue(buildSession(otherStudentId));

    await expect(service.start(sessionId, studentRequester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(sessionsRepository.update).not.toHaveBeenCalled();
  });

  it('impide consultar el progreso de otro estudiante', async () => {
    await expect(
      service.getProgressSummary(otherStudentId, studentRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessionsRepository.findByStudentAndStatuses).not.toHaveBeenCalled();
  });

  it('mantiene la creación manual restringida a teacher/admin', async () => {
    await expect(
      service.create(buildCreateDto(), studentRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dailyPlansRepository.findById).not.toHaveBeenCalled();
  });

  it('rechaza crear una sesión con categoría distinta a la del plan', async () => {
    dailyPlansRepository.findById.mockResolvedValue(buildPlan());

    await expect(
      service.create(
        { ...buildCreateDto(), category_id: otherCategoryId },
        teacherRequester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionsRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza actualizar una sesión con categoría distinta a la del plan', async () => {
    sessionsRepository.findById.mockResolvedValue(buildSession());
    dailyPlansRepository.findById.mockResolvedValue(buildPlan());

    await expect(
      service.update(
        sessionId,
        { category_id: otherCategoryId },
        teacherRequester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionsRepository.update).not.toHaveBeenCalled();
  });

  it('añade una sesión copiando las tarjetas de la sesión existente', async () => {
    const existing = buildSession();
    const created = { ...buildSession(), id: otherStudentId, session_index: 2 };
    dailyPlansRepository.findById.mockResolvedValue(buildPlan());
    sessionsRepository.findByDailyPlanId
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([existing, created]);
    sessionCardsRepository.listBySessionId.mockResolvedValue([
      { word_card_id: '507f1f77bcf86cd799439051', order_index: 0 },
    ]);
    sessionsRepository.create.mockResolvedValue(created);

    const sessions = await service.addToDailyPlan(
      planId,
      { count: 1 },
      teacherRequester,
    );

    expect(sessionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dailyPlanId: planId, sessionIndex: 2 }),
    );
    expect(sessionCardsRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: created.id,
        wordCardId: '507f1f77bcf86cd799439051',
      }),
    ]);
    expect(dailyPlansRepository.update).toHaveBeenCalledWith(planId, {
      targetSessionsCount: 2,
    });
    expect(sessions).toHaveLength(2);
  });

  it('usa las tarjetas del plan maestro al recrear la primera sesión del día', async () => {
    const studyPlanId = '507f1f77bcf86cd799439061';
    const levelId = '507f1f77bcf86cd799439062';
    const wordCardId = '507f1f77bcf86cd799439063';
    const plan = {
      ...buildPlan(),
      study_plan_id: studyPlanId,
      study_plan_level_id: levelId,
    };
    const created = buildSession();
    dailyPlansRepository.findById.mockResolvedValue(plan);
    sessionsRepository.findByDailyPlanId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    studyPlansRepository.findById.mockResolvedValue({
      id: studyPlanId,
      levels: [
        {
          id: levelId,
          categories: [
            { category_id: categoryId, word_card_ids: [wordCardId] },
          ],
        },
      ],
    });
    wordCardsRepository.findByIds.mockResolvedValue([
      {
        id: wordCardId,
        student_id: studentId,
        category_id: categoryId,
        status: 'active',
      },
    ]);
    sessionsRepository.create.mockResolvedValue(created);

    await service.addToDailyPlan(planId, { count: 1 }, teacherRequester);

    expect(sessionCardsRepository.createMany).toHaveBeenCalledWith([
      { sessionId, wordCardId, orderIndex: 0 },
    ]);
    expect(
      wordCardsRepository.listByStudentCategoryAndStatuses,
    ).not.toHaveBeenCalled();
  });

  it('restaura una sesión sin eliminar el historial de exposición', async () => {
    sessionsRepository.findById
      .mockResolvedValueOnce({ ...buildSession(), status: 'completed' })
      .mockResolvedValueOnce(buildSession());

    const restored = await service.restore(sessionId, teacherRequester);

    expect(sessionCardsRepository.resetBySessionIds).toHaveBeenCalledWith([
      sessionId,
    ]);
    expect(sessionsRepository.restoreByIds).toHaveBeenCalledWith([sessionId]);
    expect(exposureLogsRepository.deleteBySessionIds).not.toHaveBeenCalled();
    expect(restored.status).toBe('planned');
  });

  it('elimina una sesión y sus registros asociados', async () => {
    sessionsRepository.findById.mockResolvedValue(buildSession());
    sessionsRepository.findByDailyPlanId.mockResolvedValue([]);

    await service.delete(sessionId, teacherRequester);

    expect(exposureLogsRepository.deleteBySessionIds).toHaveBeenCalledWith([
      sessionId,
    ]);
    expect(sessionCardsRepository.deleteBySessionIds).toHaveBeenCalledWith([
      sessionId,
    ]);
    expect(sessionsRepository.deleteById).toHaveBeenCalledWith(sessionId);
  });

  function buildPlan(targetStudentId = studentId) {
    return {
      id: planId,
      student_id: targetStudentId,
      plan_date: new Date('2026-09-07T00:00:00.000Z'),
      target_cards_count: 3,
      target_sessions_count: 1,
      category_id: categoryId,
      created_at: now,
      updated_at: now,
    };
  }

  function buildSession(targetStudentId = studentId) {
    return {
      id: sessionId,
      student_id: targetStudentId,
      daily_plan_id: planId,
      session_index: 1,
      category_id: categoryId,
      display_ms: 2200,
      audio_mode: 'manual' as const,
      status: 'planned' as const,
      mode: 'auto' as const,
      created_at: now,
      updated_at: now,
    };
  }

  function buildCreateDto() {
    return {
      student_id: studentId,
      daily_plan_id: planId,
      session_index: 1,
      category_id: categoryId,
      display_ms: 2200,
      audio_mode: 'manual' as const,
      status: 'planned' as const,
      mode: 'auto' as const,
    };
  }
});
