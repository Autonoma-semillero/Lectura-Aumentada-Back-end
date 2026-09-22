import { Connection, Types } from 'mongoose';
import { StudyPlansRepository } from './study-plans.repository';

describe('StudyPlansRepository', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const cardId = '507f1f77bcf86cd799439031';
  const planId = '507f1f77bcf86cd799439041';
  const levelId = '507f1f77bcf86cd799439051';
  const creatorId = '507f1f77bcf86cd799439061';

  it('sintetiza la audiencia al leer un documento legacy', async () => {
    const legacy = buildStoredPlan({
      student_id: new Types.ObjectId(studentId),
      levels: [
        buildStoredLevel({
          category_id: new Types.ObjectId(categoryId),
          word_card_ids: [new Types.ObjectId(cardId)],
        }),
      ],
    });
    const { repository, findOne } = createRepository();
    findOne.mockResolvedValue(legacy);

    const plan = await repository.findById(planId);

    expect(plan).toMatchObject({
      student_id: studentId,
      group_ids: [],
      direct_student_ids: [studentId],
      student_ids: [studentId],
      students: [{ student_id: studentId, sources: [{ type: 'direct' }] }],
      schema_version: 1,
      levels: [
        expect.objectContaining({
          categories: [{ category_id: categoryId, word_card_ids: [cardId] }],
        }),
      ],
    });
  });

  it('consulta planes activos por audiencia v2 o student_id legacy', async () => {
    const { repository, findOne } = createRepository();
    findOne.mockResolvedValue(null);
    const date = new Date('2026-09-20T00:00:00.000Z');

    await repository.findActiveForStudentAndDate(studentId, date);

    const objectId = new Types.ObjectId(studentId);
    expect(findOne).toHaveBeenCalledWith(
      {
        $or: [{ student_ids: objectId }, { student_id: objectId }],
        status: 'active',
        start_date: { $lte: date },
        end_date: { $gte: date },
      },
      { sort: { updated_at: -1 } },
    );
  });

  it('filtra listados por student_ids v2 o student_id legacy', async () => {
    const { repository, find } = createRepository();

    await repository.findAll({ studentId });

    const objectId = new Types.ObjectId(studentId);
    expect(find).toHaveBeenCalledWith({
      $or: [{ student_ids: objectId }, { student_id: objectId }],
      status: { $ne: 'archived' },
    });
  });

  it('busca solapamientos contra cualquiera de los estudiantes y legacy', async () => {
    const { repository, findOne } = createRepository();
    findOne.mockResolvedValue(null);
    const startDate = new Date('2026-09-01T00:00:00.000Z');
    const endDate = new Date('2026-09-30T00:00:00.000Z');

    await repository.findOverlappingActive(
      [studentId, otherStudentId],
      startDate,
      endDate,
    );

    const objectIds = [studentId, otherStudentId].map(
      (id) => new Types.ObjectId(id),
    );
    expect(findOne).toHaveBeenCalledWith(
      {
        $or: [
          { student_ids: { $in: objectIds } },
          { student_id: { $in: objectIds } },
        ],
        status: 'active',
        start_date: { $lte: endDate },
        end_date: { $gte: startDate },
      },
      // El orden por `_id` es parte del contrato: devuelve el plan más antiguo
      // de los que solapan, que es lo que desempata una carrera de creación.
      { sort: { _id: 1 } },
    );
  });

  it('persiste nuevos planes como schema v2 sin student_id singleton', async () => {
    const { repository, findOne, insertOne } = createRepository();
    const insertedId = new Types.ObjectId(planId);
    let insertedDocument: Record<string, unknown> | undefined;
    insertOne.mockImplementation(async (document) => {
      insertedDocument = document;
      return { insertedId };
    });
    findOne.mockImplementation(async () => ({
      _id: insertedId,
      ...insertedDocument,
    }));

    const created = await repository.create({
      name: 'Plan de grupo',
      groupIds: [],
      directStudentIds: [studentId],
      students: [{ student_id: studentId, sources: [{ type: 'direct' }] }],
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T00:00:00.000Z'),
      sessionsPerDay: 5,
      displayMs: 2200,
      audioMode: 'manual',
      mode: 'auto',
      status: 'active',
      levels: [
        {
          id: levelId,
          name: 'Nivel 1',
          order_index: 1,
          start_date: new Date('2026-09-01T00:00:00.000Z'),
          end_date: new Date('2026-09-30T00:00:00.000Z'),
          categories: [{ category_id: categoryId, target_cards_count: 4 }],
        },
      ],
      createdBy: creatorId,
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        schema_version: 2,
        group_ids: [],
        direct_student_ids: [new Types.ObjectId(studentId)],
        student_ids: [new Types.ObjectId(studentId)],
        students: [
          {
            student_id: new Types.ObjectId(studentId),
            sources: [{ type: 'direct' }],
          },
        ],
        levels: [
          expect.objectContaining({
            categories: [
              {
                category_id: new Types.ObjectId(categoryId),
                target_cards_count: 4,
              },
            ],
          }),
        ],
      }),
    );
    expect(insertedDocument).not.toHaveProperty('student_id');
    expect(created.student_id).toBe(studentId);
  });

  it('persiste y reconstruye la selección explícita por palabras', async () => {
    const { repository, findOne, insertOne } = createRepository();
    const insertedId = new Types.ObjectId(planId);
    let insertedDocument: Record<string, unknown> | undefined;
    insertOne.mockImplementation(async (document) => {
      insertedDocument = document;
      return { insertedId };
    });
    findOne.mockImplementation(async () => ({
      _id: insertedId,
      ...insertedDocument,
    }));

    const created = await repository.create({
      name: 'Plan con palabras',
      groupIds: [],
      directStudentIds: [studentId],
      students: [{ student_id: studentId, sources: [{ type: 'direct' }] }],
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T00:00:00.000Z'),
      sessionsPerDay: 5,
      displayMs: 2200,
      audioMode: 'manual',
      mode: 'auto',
      status: 'active',
      levels: [
        {
          id: levelId,
          name: 'Nivel 1',
          order_index: 1,
          start_date: new Date('2026-09-01T00:00:00.000Z'),
          end_date: new Date('2026-09-30T00:00:00.000Z'),
          categories: [
            { category_id: categoryId, word_card_words: ['gato', 'perro'] },
          ],
        },
      ],
      createdBy: creatorId,
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        levels: [
          expect.objectContaining({
            categories: [
              {
                category_id: new Types.ObjectId(categoryId),
                word_card_words: ['gato', 'perro'],
              },
            ],
          }),
        ],
      }),
    );
    expect(created.levels[0].categories[0]).toEqual({
      category_id: categoryId,
      target_cards_count: undefined,
      word_card_ids: undefined,
      word_card_words: ['gato', 'perro'],
    });
  });

  function createRepository() {
    const findOne = jest.fn();
    const insertOne = jest.fn();
    const toArray = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ toArray });
    const find = jest.fn().mockReturnValue({ sort });
    const collection = { findOne, insertOne, find };
    const connection = Object.create(null) as Connection;
    Object.defineProperty(connection, 'db', {
      value: { collection: jest.fn().mockReturnValue(collection) },
    });
    return {
      repository: new StudyPlansRepository(connection),
      findOne,
      insertOne,
      find,
    };
  }

  function buildStoredPlan(extra: Record<string, unknown>) {
    const now = new Date('2026-09-01T00:00:00.000Z');
    return {
      _id: new Types.ObjectId(planId),
      name: 'Plan legacy',
      start_date: now,
      end_date: new Date('2026-09-30T00:00:00.000Z'),
      sessions_per_day: 5,
      display_ms: 2200,
      audio_mode: 'manual',
      mode: 'auto',
      status: 'active',
      created_by: new Types.ObjectId(creatorId),
      created_at: now,
      updated_at: now,
      ...extra,
    };
  }

  function buildStoredLevel(category: Record<string, unknown>) {
    return {
      _id: new Types.ObjectId(levelId),
      name: 'Nivel 1',
      order_index: 1,
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      end_date: new Date('2026-09-30T00:00:00.000Z'),
      categories: [category],
    };
  }
});
