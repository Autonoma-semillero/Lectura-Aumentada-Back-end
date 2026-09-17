import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { STUDY_PLANS_REPOSITORY } from '../domain/constants/doman.tokens';
import { DailyPlansService } from './daily-plans.service';
import { StudyPlansService } from './study-plans.service';

describe('StudyPlansService', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const otherCategoryId = '507f1f77bcf86cd799439022';
  const cardId = '507f1f77bcf86cd799439031';
  const otherCardId = '507f1f77bcf86cd799439032';
  const planId = '507f1f77bcf86cd799439041';
  const levelId = '507f1f77bcf86cd799439051';
  const requester = {
    userId: '507f1f77bcf86cd799439061',
    role: 'teacher' as const,
  };

  const studyPlansRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveForStudentAndDate: jest.fn(),
    findOverlappingActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const wordCardsRepository = {
    findByIds: jest.fn(),
  };
  const categoriesService = {
    findById: jest.fn(),
  };
  const dailyPlansService = {
    generate: jest.fn(),
  };

  let service: StudyPlansService;

  beforeEach(async () => {
    jest.resetAllMocks();
    studyPlansRepository.findOverlappingActive.mockResolvedValue(null);
    categoriesService.findById.mockResolvedValue({ id: categoryId });
    wordCardsRepository.findByIds.mockResolvedValue([
      buildCard(cardId, studentId, categoryId),
    ]);
    studyPlansRepository.create.mockImplementation(async (payload) => ({
      ...buildPlan(),
      name: payload.name,
      sessions_per_day: payload.sessionsPerDay,
      display_ms: payload.displayMs,
      levels: payload.levels,
    }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        StudyPlansService,
        { provide: STUDY_PLANS_REPOSITORY, useValue: studyPlansRepository },
        { provide: WORD_CARDS_REPOSITORY, useValue: wordCardsRepository },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: DailyPlansService, useValue: dailyPlansService },
      ],
    }).compile();
    service = moduleRef.get(StudyPlansService);
  });

  it('crea un plan con cinco sesiones diarias por omisión', async () => {
    await service.create(buildCreateDto(), requester);

    expect(studyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Plan trimestral',
        studentId,
        sessionsPerDay: 5,
        displayMs: 2200,
        status: 'active',
        createdBy: requester.userId,
      }),
    );
  });

  it('rechaza tarjetas que no pertenecen al estudiante del plan', async () => {
    wordCardsRepository.findByIds.mockResolvedValue([
      buildCard(cardId, otherStudentId, categoryId),
    ]);

    await expect(service.create(buildCreateDto(), requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('impide dos planes activos solapados para el mismo estudiante', async () => {
    studyPlansRepository.findOverlappingActive.mockResolvedValue(buildPlan());

    await expect(service.create(buildCreateDto(), requester)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('exige redefinir niveles al cambiar el estudiante', async () => {
    studyPlansRepository.findById.mockResolvedValue(buildPlan());

    await expect(
      service.update(planId, { student_id: otherStudentId }, requester),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('genera un plan diario por cada categoría del nivel vigente', async () => {
    const plan = buildPlan();
    plan.levels[0].categories.push({
      category_id: otherCategoryId,
      word_card_ids: [otherCardId],
    });
    studyPlansRepository.findById.mockResolvedValue(plan);
    dailyPlansService.generate
      .mockResolvedValueOnce({ plan: { id: 'one' } })
      .mockResolvedValueOnce({ plan: { id: 'two' } });

    const generated = await service.generateDay(
      plan.id,
      { date: '2026-09-20' },
      requester,
    );

    expect(generated).toHaveLength(2);
    expect(dailyPlansService.generate).toHaveBeenNthCalledWith(
      1,
      {
        student_id: studentId,
        study_plan_id: plan.id,
        category_id: categoryId,
        plan_date: '2026-09-20',
        force: false,
      },
      requester,
    );
    expect(dailyPlansService.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ category_id: otherCategoryId }),
      requester,
    );
  });

  it('expone al estudiante solo las categorías de su nivel vigente', async () => {
    studyPlansRepository.findActiveForStudentAndDate.mockResolvedValue(
      buildPlan(),
    );
    categoriesService.findById.mockResolvedValue({
      id: categoryId,
      name: 'Animales',
      slug: 'animales',
    });

    await expect(
      service.getActiveConfiguration(
        { student_id: studentId, date: '2026-09-20' },
        { userId: studentId, role: 'student' },
      ),
    ).resolves.toMatchObject({
      plan_id: planId,
      level_id: levelId,
      categories: [
        {
          id: categoryId,
          name: 'Animales',
          available_word_cards_count: 1,
        },
      ],
    });
  });

  function buildCreateDto() {
    return {
      name: ' Plan trimestral ',
      student_id: studentId,
      start_date: '2026-09-01',
      end_date: '2026-11-30',
      levels: [
        {
          name: 'Nivel 1',
          order_index: 1,
          start_date: '2026-09-01',
          end_date: '2026-11-30',
          categories: [
            {
              category_id: categoryId,
              word_card_ids: [cardId],
            },
          ],
        },
      ],
    };
  }

  function buildPlan() {
    const now = new Date('2026-09-01T00:00:00.000Z');
    return {
      id: planId,
      name: 'Plan trimestral',
      student_id: studentId,
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      end_date: new Date('2026-11-30T00:00:00.000Z'),
      sessions_per_day: 5,
      display_ms: 2200,
      audio_mode: 'manual' as const,
      mode: 'auto' as const,
      status: 'active' as const,
      levels: [
        {
          id: levelId,
          name: 'Nivel 1',
          order_index: 1,
          start_date: new Date('2026-09-01T00:00:00.000Z'),
          end_date: new Date('2026-11-30T00:00:00.000Z'),
          categories: [
            {
              category_id: categoryId,
              word_card_ids: [cardId],
            },
          ],
        },
      ],
      created_by: requester.userId,
      created_at: now,
      updated_at: now,
    };
  }

  function buildCard(id: string, targetStudentId: string, targetCategoryId: string) {
    return {
      id,
      student_id: targetStudentId,
      category_id: targetCategoryId,
      word: 'gato',
      initial_letter: 'G',
      status: 'active' as const,
      times_shown: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
});
