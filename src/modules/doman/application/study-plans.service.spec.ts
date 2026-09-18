import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { GroupsService } from '../../groups/application/groups.service';
import { STUDY_PLANS_REPOSITORY } from '../domain/constants/doman.tokens';
import { DailyPlansService } from './daily-plans.service';
import { StudyPlansService } from './study-plans.service';

describe('StudyPlansService', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const otherCategoryId = '507f1f77bcf86cd799439022';
  const thirdCategoryId = '507f1f77bcf86cd799439023';
  const cardId = '507f1f77bcf86cd799439031';
  const planId = '507f1f77bcf86cd799439041';
  const levelId = '507f1f77bcf86cd799439051';
  const groupId = '507f1f77bcf86cd799439071';
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
    delete: jest.fn(),
    restore: jest.fn(),
  };
  const wordCardsRepository = {
    findByIds: jest.fn(),
    listByStudentCategoryAndStatuses: jest.fn(),
  };
  const categoriesService = {
    findById: jest.fn(),
  };
  const groupsService = {
    resolveAudience: jest.fn(),
  };
  const dailyPlansService = {
    generateForAssignment: jest.fn(),
  };

  let service: StudyPlansService;

  beforeEach(async () => {
    jest.resetAllMocks();
    studyPlansRepository.findOverlappingActive.mockResolvedValue(null);
    categoriesService.findById.mockResolvedValue({
      id: categoryId,
      name: 'Animales',
      slug: 'animales',
    });
    groupsService.resolveAudience.mockImplementation(
      async (_groupIds: string[], directStudentIds: string[]) => ({
        student_ids: [...new Set(directStudentIds)],
        students: [...new Set(directStudentIds)].map((targetStudentId) => ({
          student_id: targetStudentId,
          sources: [{ type: 'direct' as const }],
        })),
      }),
    );
    wordCardsRepository.findByIds.mockResolvedValue([
      buildCard(cardId, studentId, categoryId),
    ]);
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([]);
    studyPlansRepository.create.mockImplementation(async (payload) => ({
      ...buildPlan(),
      name: payload.name,
      group_ids: payload.groupIds,
      direct_student_ids: payload.directStudentIds,
      student_ids: payload.students.map(
        (student: { student_id: string }) => student.student_id,
      ),
      students: payload.students,
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
        { provide: GroupsService, useValue: groupsService },
        { provide: DailyPlansService, useValue: dailyPlansService },
      ],
    }).compile();
    service = moduleRef.get(StudyPlansService);
  });

  it('crea un plan v2 con audiencia directa y regla dinámica', async () => {
    await service.create(buildCreateDto(), requester);

    expect(studyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Plan trimestral',
        groupIds: [],
        directStudentIds: [studentId],
        students: [{ student_id: studentId, sources: [{ type: 'direct' }] }],
        sessionsPerDay: 5,
        displayMs: 2200,
        status: 'active',
        createdBy: requester.userId,
        levels: [
          expect.objectContaining({
            categories: [{ category_id: categoryId, target_cards_count: 4 }],
          }),
        ],
      }),
    );
  });

  it('persiste una fotografía deduplicada de grupo más estudiantes directos', async () => {
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: [studentId, otherStudentId],
      students: [
        {
          student_id: studentId,
          sources: [{ type: 'group', group_id: groupId }, { type: 'direct' }],
        },
        {
          student_id: otherStudentId,
          sources: [{ type: 'group', group_id: groupId }],
        },
      ],
    });

    await service.create(
      {
        ...buildCreateDto(),
        group_ids: [groupId],
        student_ids: [studentId],
      },
      requester,
    );

    expect(studyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        groupIds: [groupId],
        directStudentIds: [studentId],
        students: expect.arrayContaining([
          expect.objectContaining({ student_id: studentId }),
          expect.objectContaining({ student_id: otherStudentId }),
        ]),
      }),
    );
    expect(studyPlansRepository.findOverlappingActive).toHaveBeenCalledWith(
      [studentId, otherStudentId],
      expect.any(Date),
      expect.any(Date),
      undefined,
    );
  });

  it('acepta el shorthand student_id con selección exacta legacy', async () => {
    await service.create(buildLegacyCreateDto(), requester);

    expect(wordCardsRepository.findByIds).toHaveBeenCalledWith([cardId]);
    expect(studyPlansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        directStudentIds: [studentId],
        levels: [
          expect.objectContaining({
            categories: [{ category_id: categoryId, word_card_ids: [cardId] }],
          }),
        ],
      }),
    );
  });

  it('rechaza word_card_ids para una audiencia v2', async () => {
    const dto = buildCreateDto();
    dto.levels[0].categories[0] = {
      category_id: categoryId,
      word_card_ids: [cardId],
    } as never;

    await expect(service.create(dto, requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza una audiencia resuelta mayor de cincuenta estudiantes', async () => {
    const students = Array.from({ length: 51 }, (_, index) => ({
      student_id: `507f1f77bcf86cd79943${index.toString(16).padStart(4, '0')}`,
      sources: [{ type: 'group' as const, group_id: groupId }],
    }));
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: students.map((student) => student.student_id),
      students,
    });

    await expect(service.create(buildCreateDto(), requester)).rejects.toThrow(
      'cannot exceed 50 students',
    );
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza un nivel cuya generación síncrona excede cien trabajos', async () => {
    const students = Array.from({ length: 50 }, (_, index) => ({
      student_id: `507f1f77bcf86cd79943${index.toString(16).padStart(4, '0')}`,
      sources: [{ type: 'direct' as const }],
    }));
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: students.map((student) => student.student_id),
      students,
    });
    const dto = buildCreateDto();
    dto.levels[0].categories.push(
      { category_id: otherCategoryId, target_cards_count: 2 },
      { category_id: thirdCategoryId, target_cards_count: 2 },
    );

    await expect(service.create(dto, requester)).rejects.toThrow(
      'cannot exceed 100 student-category jobs',
    );
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza una audiencia resuelta sin estudiantes', async () => {
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: [],
      students: [],
    });

    await expect(service.create(buildCreateDto(), requester)).rejects.toThrow(
      'selected audience has no students',
    );
    expect(studyPlansRepository.findOverlappingActive).not.toHaveBeenCalled();
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza una selección legacy con tarjetas de otro estudiante', async () => {
    wordCardsRepository.findByIds.mockResolvedValue([
      buildCard(cardId, otherStudentId, categoryId),
    ]);

    await expect(
      service.create(buildLegacyCreateDto(), requester),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza una categoría con regla dinámica y selección exacta simultáneas', async () => {
    const dto = buildLegacyCreateDto();
    dto.levels[0].categories[0] = {
      category_id: categoryId,
      target_cards_count: 3,
      word_card_ids: [cardId],
    } as never;

    await expect(service.create(dto, requester)).rejects.toThrow(
      'cannot define both',
    );
    expect(studyPlansRepository.create).not.toHaveBeenCalled();
  });

  it('lista para el docente únicamente los planes creados por él', async () => {
    studyPlansRepository.findAll.mockResolvedValue([]);

    await service.list({}, requester);

    expect(studyPlansRepository.findAll).toHaveBeenCalledWith({
      studentId: undefined,
      status: undefined,
      createdBy: requester.userId,
    });
  });

  it('permite al administrador listar planes de todos los docentes', async () => {
    studyPlansRepository.findAll.mockResolvedValue([]);

    await service.list({}, { userId: requester.userId, role: 'admin' });

    expect(studyPlansRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: undefined }),
    );
  });

  it('impide que un docente modifique un plan creado por otro', async () => {
    studyPlansRepository.findById.mockResolvedValue({
      ...buildPlan(),
      created_by: '507f1f77bcf86cd799439099',
    });

    await expect(
      service.update(planId, { name: 'Nombre ajeno' }, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(studyPlansRepository.update).not.toHaveBeenCalled();
  });

  it('permite al administrador gestionar un plan de otro docente', async () => {
    studyPlansRepository.findById.mockResolvedValue({
      ...buildPlan(),
      created_by: '507f1f77bcf86cd799439099',
    });
    studyPlansRepository.update.mockResolvedValue({
      ...buildPlan(),
      name: 'Nombre administrado',
    });

    await expect(
      service.update(
        planId,
        { name: 'Nombre administrado' },
        { userId: requester.userId, role: 'admin' },
      ),
    ).resolves.toMatchObject({ name: 'Nombre administrado' });
  });

  it('impide cambiar la audiencia por PATCH', async () => {
    studyPlansRepository.findById.mockResolvedValue(buildPlan());

    await expect(
      service.update(planId, { student_id: otherStudentId }, requester),
    ).rejects.toThrow('audience is immutable');
    expect(studyPlansRepository.update).not.toHaveBeenCalled();
  });

  it('tolera el alias student_id idéntico enviado por un cliente legacy', async () => {
    studyPlansRepository.findById.mockResolvedValue(buildPlan());
    studyPlansRepository.update.mockResolvedValue(buildPlan());

    await expect(
      service.update(
        planId,
        { name: 'Nombre compatible', student_id: studentId },
        requester,
      ),
    ).resolves.toBeDefined();
    expect(studyPlansRepository.update).toHaveBeenCalledWith(
      planId,
      expect.objectContaining({ name: 'Nombre compatible' }),
    );
  });

  it('rechaza explícitamente group_ids y student_ids en PATCH', async () => {
    studyPlansRepository.findById.mockResolvedValue(buildPlan());

    await expect(
      service.update(
        planId,
        { group_ids: [groupId], student_ids: [otherStudentId] },
        requester,
      ),
    ).rejects.toThrow('audience is immutable');
    expect(studyPlansRepository.update).not.toHaveBeenCalled();
  });

  it('impide planes activos solapados para cualquiera de los estudiantes', async () => {
    studyPlansRepository.findOverlappingActive.mockResolvedValue(buildPlan());

    await expect(
      service.create(buildCreateDto(), requester),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('genera cada categoría para cada estudiante y conserva resultados parciales', async () => {
    const plan = buildPlan([studentId, otherStudentId]);
    plan.levels[0].categories.push({
      category_id: otherCategoryId,
      target_cards_count: 2,
    });
    studyPlansRepository.findById.mockResolvedValue(plan);
    dailyPlansService.generateForAssignment.mockImplementation(
      async (dto: { student_id: string; category_id: string }) => {
        if (
          dto.student_id === otherStudentId &&
          dto.category_id === otherCategoryId
        ) {
          throw new BadRequestException('No available cards');
        }
        return {
          status: 'generated',
          plan: { plan: { id: `${dto.student_id}-${dto.category_id}` } },
        };
      },
    );

    const generated = await service.generateDay(
      plan.id,
      { date: '2026-09-20' },
      requester,
    );

    expect(generated.summary).toEqual({
      total: 4,
      generated: 3,
      existing: 0,
      failed: 1,
    });
    expect(generated.results).toHaveLength(4);
    expect(generated.results).toContainEqual(
      expect.objectContaining({
        student_id: otherStudentId,
        category_id: otherCategoryId,
        status: 'failed',
        error: 'No available cards',
      }),
    );
    expect(dailyPlansService.generateForAssignment).toHaveBeenCalledWith(
      {
        student_id: studentId,
        study_plan_id: plan.id,
        category_id: categoryId,
        plan_date: '2026-09-20',
        target_cards_count: 2,
        force: false,
      },
      requester,
    );
  });

  it('expone categorías activas resolviendo tarjetas propias del estudiante', async () => {
    studyPlansRepository.findActiveForStudentAndDate.mockResolvedValue(
      buildPlan(),
    );
    wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([
      buildCard(cardId, studentId, categoryId),
      buildCard('507f1f77bcf86cd799439032', studentId, categoryId),
    ]);

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
          available_word_cards_count: 2,
        },
      ],
    });
    expect(
      wordCardsRepository.listByStudentCategoryAndStatuses,
    ).toHaveBeenCalledWith(studentId, categoryId, ['new', 'active']);
  });

  describe('carrera de solapamiento al crear', () => {
    const requester = { userId: '507f1f77bcf86cd799439001', role: 'teacher' as const };

    /** Hace que `create` devuelva un plan con el `_id` indicado. */
    function createWithId(id: string): void {
      studyPlansRepository.create.mockImplementation(async (payload) => ({
        ...buildPlan(),
        id,
        status: 'active' as const,
        student_ids: payload.students.map(
          (student: { student_id: string }) => student.student_id,
        ),
      }));
    }

    it('conserva el plan cuando gana la carrera y no consulta borrado', async () => {
      createWithId('507f1f77bcf86cd799439100');
      // El pre-check pasa, pero después de insertar aparece un plan MÁS NUEVO.
      studyPlansRepository.findOverlappingActive
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...buildPlan(),
          id: '507f1f77bcf86cd799439999',
        });

      await expect(
        service.create(buildCreateDto(), requester),
      ).resolves.toMatchObject({ id: '507f1f77bcf86cd799439100' });
      expect(studyPlansRepository.delete).not.toHaveBeenCalled();
    });

    it('cede y borra su propio plan cuando otro más antiguo ganó la carrera', async () => {
      createWithId('507f1f77bcf86cd799439999');
      studyPlansRepository.findOverlappingActive
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...buildPlan(),
          id: '507f1f77bcf86cd799439100',
        });

      await expect(
        service.create(buildCreateDto(), requester),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(studyPlansRepository.delete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439999',
      );
    });

    it('con tres creaciones concurrentes sobrevive exactamente una', async () => {
      const ids = [
        '507f1f77bcf86cd799439100',
        '507f1f77bcf86cd799439200',
        '507f1f77bcf86cd799439300',
      ];
      // `findOverlappingActive` devuelve el más antiguo de LOS OTROS, que es
      // exactamente el contrato que el desempate necesita.
      const survivors: string[] = [];
      for (const id of ids) {
        jest.clearAllMocks();
        createWithId(id);
        const earliestOther = ids.filter((other) => other !== id).sort()[0];
        studyPlansRepository.findOverlappingActive
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ ...buildPlan(), id: earliestOther });

        await service
          .create(buildCreateDto(), requester)
          .then(() => survivors.push(id))
          .catch(() => undefined);
      }

      expect(survivors).toEqual([ids[0]]);
    });

    it('revierte el update al estado previo cuando pierde la carrera', async () => {
      const original = {
        ...buildPlan(),
        id: '507f1f77bcf86cd799439999',
        status: 'draft' as const,
        created_by: requester.userId,
      };
      studyPlansRepository.findById.mockResolvedValue(original);
      studyPlansRepository.update.mockResolvedValue({
        ...original,
        status: 'active' as const,
      });
      studyPlansRepository.findOverlappingActive
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...buildPlan(),
          id: '507f1f77bcf86cd799439100',
        });

      await expect(
        service.update(original.id, { status: 'active' }, requester),
      ).rejects.toBeInstanceOf(ConflictException);

      // Se revierte con el documento capturado ANTES de escribir, no con un
      // patch: así los opcionales que el update agregó quedan borrados.
      expect(studyPlansRepository.restore).toHaveBeenCalledWith(original);
      expect(studyPlansRepository.delete).not.toHaveBeenCalled();
    });

    it('conserva el update cuando gana la carrera', async () => {
      const original = {
        ...buildPlan(),
        id: '507f1f77bcf86cd799439100',
        status: 'draft' as const,
        created_by: requester.userId,
      };
      studyPlansRepository.findById.mockResolvedValue(original);
      studyPlansRepository.update.mockResolvedValue({
        ...original,
        status: 'active' as const,
      });
      studyPlansRepository.findOverlappingActive
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...buildPlan(),
          id: '507f1f77bcf86cd799439999',
        });

      await expect(
        service.update(original.id, { status: 'active' }, requester),
      ).resolves.toMatchObject({ status: 'active' });
      expect(studyPlansRepository.restore).not.toHaveBeenCalled();
    });

    it('sigue devolviendo Conflict aunque falle la compensación al ceder', async () => {
      createWithId('507f1f77bcf86cd799439999');
      studyPlansRepository.findOverlappingActive
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...buildPlan(),
          id: '507f1f77bcf86cd799439100',
        });
      studyPlansRepository.delete.mockRejectedValue(
        new Error('delete timed out'),
      );

      // El cliente debe ver el 409 que corresponde, no un 500 filtrado por la
      // compensación.
      await expect(
        service.create(buildCreateDto(), requester),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('no revalida la carrera para un plan que no nace activo', async () => {
      createWithId('507f1f77bcf86cd799439100');
      studyPlansRepository.create.mockImplementation(async () => ({
        ...buildPlan(),
        id: '507f1f77bcf86cd799439100',
        status: 'draft' as const,
      }));

      await service.create(
        { ...buildCreateDto(), status: 'draft' as const },
        requester,
      );

      // Solo la llamada del pre-check, ninguna revalidación posterior.
      expect(studyPlansRepository.findOverlappingActive).not.toHaveBeenCalled();
      expect(studyPlansRepository.delete).not.toHaveBeenCalled();
    });
  });

  function buildCreateDto() {
    return {
      name: ' Plan trimestral ',
      student_ids: [studentId],
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
              target_cards_count: 4,
            },
          ],
        },
      ],
    };
  }

  function buildLegacyCreateDto() {
    return {
      name: 'Plan legacy',
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

  function buildPlan(targetStudentIds: string[] = [studentId]) {
    const now = new Date('2026-09-01T00:00:00.000Z');
    return {
      id: planId,
      name: 'Plan trimestral',
      group_ids: [],
      direct_student_ids: targetStudentIds,
      student_ids: targetStudentIds,
      students: targetStudentIds.map((targetStudentId) => ({
        student_id: targetStudentId,
        sources: [{ type: 'direct' as const }],
      })),
      schema_version: 2,
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
              target_cards_count: 2,
            },
          ],
        },
      ],
      created_by: requester.userId,
      created_at: now,
      updated_at: now,
    };
  }

  function buildCard(
    id: string,
    targetStudentId: string,
    targetCategoryId: string,
  ) {
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
