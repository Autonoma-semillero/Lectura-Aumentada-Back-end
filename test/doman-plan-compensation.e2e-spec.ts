import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from '../src/modules/doman/domain/constants/doman.tokens';
import type { IDailyPlansRepository } from '../src/modules/doman/domain/interfaces/daily-plans.repository.interface';
import type { IDomanSessionCardsRepository } from '../src/modules/doman/domain/interfaces/doman-session-cards.repository.interface';
import type { IDomanSessionsRepository } from '../src/modules/doman/domain/interfaces/doman-sessions.repository.interface';
import type { IStudyPlansRepository } from '../src/modules/doman/domain/interfaces/study-plans.repository.interface';

/**
 * Los tests unitarios de compensación usan repositorios mockeados: prueban la
 * ORQUESTACIÓN del rollback, no que los documentos realmente sobrevivan el
 * viaje de ida y vuelta a Mongo. Esto verifica lo segundo contra una base
 * real, que es donde vive el riesgo: conservar el `_id` original es lo único
 * que hace que las filas puente restauradas sigan resolviendo.
 */
describe('Compensación de planes Doman (e2e)', () => {
  let app: import('@nestjs/common').INestApplication;
  let dailyPlans: IDailyPlansRepository;
  let sessions: IDomanSessionsRepository;
  let sessionCards: IDomanSessionCardsRepository;
  let studyPlans: IStudyPlansRepository;

  const studentId = new Types.ObjectId().toHexString();
  const categoryId = new Types.ObjectId().toHexString();
  const createdPlanIds: string[] = [];
  const createdStudyPlanIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dailyPlans = app.get(DAILY_PLANS_REPOSITORY);
    sessions = app.get(DOMAN_SESSIONS_REPOSITORY);
    sessionCards = app.get(DOMAN_SESSION_CARDS_REPOSITORY);
    studyPlans = app.get(STUDY_PLANS_REPOSITORY);
  });

  afterAll(async () => {
    for (const planId of createdPlanIds) {
      const planSessions = await sessions.findByDailyPlanId(planId);
      await sessionCards.deleteBySessionIds(planSessions.map((s) => s.id));
      await sessions.deleteByDailyPlanId(planId);
      await dailyPlans.delete(planId);
    }
    for (const studyPlanId of createdStudyPlanIds) {
      await studyPlans.delete(studyPlanId);
    }
    await app.close();
  });

  async function createPlanWithSessions(planDate: Date) {
    const plan = await dailyPlans.create({
      studentId,
      planDateUtcMidnight: planDate,
      targetCardsCount: 2,
      targetSessionsCount: 1,
      categoryId,
      notes: 'original',
    });
    createdPlanIds.push(plan.id);

    const session = await sessions.create({
      studentId,
      dailyPlanId: plan.id,
      sessionIndex: 1,
      categoryId,
      displayMs: 2200,
      audioMode: 'manual',
      status: 'planned',
      mode: 'auto',
    });
    await sessionCards.createMany([
      {
        sessionId: session.id,
        wordCardId: new Types.ObjectId().toHexString(),
        orderIndex: 0,
      },
      {
        sessionId: session.id,
        wordCardId: new Types.ObjectId().toHexString(),
        orderIndex: 1,
      },
    ]);
    return { plan, session };
  }

  it('restaura sesiones y tarjetas borradas conservando sus _id originales', async () => {
    const planDate = new Date('2026-10-01T00:00:00.000Z');
    const { plan, session } = await createPlanWithSessions(planDate);

    // Snapshot, tal como lo hace el servicio antes de una regeneración.
    const snapshotSessions = await sessions.findByDailyPlanId(plan.id);
    const snapshotCards = (
      await sessionCards.listBySessionId(session.id)
    ).map(({ word_card: _ignored, ...row }) => row);
    expect(snapshotCards).toHaveLength(2);

    // Destrucción.
    await sessionCards.deleteBySessionIds([session.id]);
    await sessions.deleteByDailyPlanId(plan.id);
    expect(await sessions.findByDailyPlanId(plan.id)).toHaveLength(0);

    // Compensación.
    await sessions.restoreMany(snapshotSessions);
    await sessionCards.restoreMany(snapshotCards);

    const restoredSessions = await sessions.findByDailyPlanId(plan.id);
    expect(restoredSessions).toHaveLength(1);
    // El _id tiene que ser el mismo o las tarjetas quedan huérfanas.
    expect(restoredSessions[0].id).toBe(session.id);
    expect(restoredSessions[0].session_index).toBe(session.session_index);
    expect(restoredSessions[0].status).toBe('planned');

    const restoredCards = await sessionCards.listBySessionId(session.id);
    expect(restoredCards.map((card) => card.id).sort()).toEqual(
      snapshotCards.map((card) => card.id).sort(),
    );
    expect(restoredCards.map((card) => card.order_index)).toEqual([0, 1]);
  });

  it('restaura el plan diario dejando ausentes los campos que no tenía', async () => {
    const planDate = new Date('2026-10-02T00:00:00.000Z');
    const { plan } = await createPlanWithSessions(planDate);
    expect(plan.study_plan_id).toBeUndefined();

    // Una regeneración desde un plan de estudio agrega study_plan_id.
    const mutated = await dailyPlans.update(plan.id, {
      targetCardsCount: 40,
      studyPlanId: new Types.ObjectId().toHexString(),
      notes: 'regenerated',
    });
    expect(mutated?.study_plan_id).toBeDefined();

    await dailyPlans.restore(plan);

    const restored = await dailyPlans.findById(plan.id);
    expect(restored?.target_cards_count).toBe(2);
    expect(restored?.notes).toBe('original');
    // Lo que un patch NO podía limpiar: `undefined` significaba "no tocar".
    expect(restored?.study_plan_id).toBeUndefined();
  });

  it('revierte un plan de estudio sin materializar campos legacy', async () => {
    const created = await studyPlans.create({
      name: 'Plan de compensación',
      groupIds: [],
      directStudentIds: [studentId],
      students: [{ student_id: studentId, sources: [{ type: 'direct' }] }],
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T00:00:00.000Z'),
      sessionsPerDay: 5,
      displayMs: 2200,
      audioMode: 'manual',
      mode: 'auto',
      status: 'draft',
      levels: [],
      createdBy: new Types.ObjectId().toHexString(),
    });
    createdStudyPlanIds.push(created.id);
    expect(created.description).toBeUndefined();
    expect(created.schema_version).toBe(2);

    await studyPlans.update(created.id, {
      status: 'active',
      description: 'agregada por el update',
      sessionsPerDay: 9,
    });

    await studyPlans.restore(created);

    const restored = await studyPlans.findById(created.id);
    expect(restored?.status).toBe('draft');
    expect(restored?.sessions_per_day).toBe(5);
    // El $unset es lo que borra una descripción que el original no tenía.
    expect(restored?.description).toBeUndefined();
    // El restore no debe tocar la identidad ni la forma del esquema.
    expect(restored?.schema_version).toBe(2);
    expect(restored?.student_ids).toEqual([studentId]);
  });
});
