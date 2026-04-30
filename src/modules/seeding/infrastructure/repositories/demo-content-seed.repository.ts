import { Inject, Injectable } from '@nestjs/common';
import type { Collection, Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import {
  DemoSeedProgressLogInput,
  IDemoContentSeedRepository,
  SeedTodayPlanAndSessionsInput,
  UpsertDemoCategoryInput,
  UpsertDemoLearningUnitInput,
  UpsertDemoWordCardInput,
} from '../../domain/interfaces/demo-content-seed.repository.interface';

@Injectable()
export class DemoContentSeedRepository implements IDemoContentSeedRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  private db() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }
    return db;
  }

  private usersCollection(): Collection<Document> {
    return this.db().collection<Document>('users');
  }

  private categoriesCollection(): Collection<Document> {
    return this.db().collection<Document>('categories');
  }

  private wordCardsCollection(): Collection<Document> {
    return this.db().collection<Document>('doman_word_cards');
  }

  private learningUnitsCollection(): Collection<Document> {
    return this.db().collection<Document>('learning_units');
  }

  private progressCollection(): Collection<Document> {
    return this.db().collection<Document>('progress_logs');
  }

  private dailyPlansCollection(): Collection<Document> {
    return this.db().collection<Document>('doman_daily_plans');
  }

  private sessionsCollection(): Collection<Document> {
    return this.db().collection<Document>('doman_sessions');
  }

  private sessionCardsCollection(): Collection<Document> {
    return this.db().collection<Document>('doman_session_cards');
  }

  private exposureLogsCollection(): Collection<Document> {
    return this.db().collection<Document>('doman_exposure_logs');
  }

  async listActiveDemoStudentIds(): Promise<string[]> {
    const students = await this.usersCollection()
      .find({
        roles: 'student',
        status: 'active',
        'metadata.seeded_by': 'AuthSeedService',
      })
      .toArray();
    return students
      .map((doc) => doc._id as Types.ObjectId | undefined)
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => id.toHexString());
  }

  async upsertCategory(input: UpsertDemoCategoryInput): Promise<string> {
    const now = new Date();
    await this.categoriesCollection().updateOne(
      { slug: input.slug },
      {
        $set: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          icon: input.icon,
          sort_order: input.sortOrder,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    const doc = await this.categoriesCollection().findOne({ slug: input.slug });
    const id = doc?._id as Types.ObjectId | undefined;
    if (!id) {
      throw new Error(`Failed to upsert demo category: ${input.slug}`);
    }
    return id.toHexString();
  }

  async upsertLearningUnit(input: UpsertDemoLearningUnitInput): Promise<string> {
    const categoryOid = new Types.ObjectId(input.categoryId);
    const markerId = `demo-${input.categorySlug}-${input.word}`;
    const now = new Date();
    await this.learningUnitsCollection().updateOne(
      { marker_id: markerId },
      {
        $set: {
          word: input.word,
          category_id: categoryOid,
          marker_id: markerId,
          assets: {
            model_3d: `https://demo.lectura.local/models/${input.categorySlug}/${input.word}.glb`,
            audio_pronunciacion: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
          },
          metadata_accessibility: {
            source: input.metadataSource,
            contrast: 'high',
            reading_level: 'initial',
          },
          language: 'es',
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    const doc = await this.learningUnitsCollection().findOne({ marker_id: markerId });
    const id = doc?._id as Types.ObjectId | undefined;
    if (!id) {
      throw new Error(`Failed to upsert demo learning unit: ${markerId}`);
    }
    return id.toHexString();
  }

  async upsertWordCard(input: UpsertDemoWordCardInput): Promise<string> {
    const now = new Date();
    const studentOid = new Types.ObjectId(input.studentId);
    const categoryOid = new Types.ObjectId(input.categoryId);
    const learningUnitOid = new Types.ObjectId(input.learningUnitId);

    const setOnInsert: Record<string, unknown> = {
      student_id: studentOid,
      word: input.word,
      status: input.status,
      times_shown: input.timesShown,
      times_audio_played: input.timesAudioPlayed,
      created_at: now,
    };
    if (input.completedAt) {
      setOnInsert.completed_at = input.completedAt;
    }

    await this.wordCardsCollection().updateOne(
      {
        student_id: studentOid,
        word: input.word,
      },
      {
        $set: {
          initial_letter: input.initialLetter,
          audio_url: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
          category_id: categoryOid,
          learning_unit_id: learningUnitOid,
          language: 'es',
          updated_at: now,
        },
        $setOnInsert: setOnInsert,
      },
      { upsert: true },
    );

    const doc = await this.wordCardsCollection().findOne({
      student_id: studentOid,
      word: input.word,
    });
    const id = doc?._id as Types.ObjectId | undefined;
    if (!id) {
      throw new Error(`Failed to upsert demo word card: ${input.word}`);
    }
    return id.toHexString();
  }

  async deleteWordCardsNotInWordList(
    studentId: string,
    categoryId: string,
    words: string[],
  ): Promise<void> {
    await this.wordCardsCollection().deleteMany({
      student_id: new Types.ObjectId(studentId),
      category_id: new Types.ObjectId(categoryId),
      word: { $nin: words },
    });
  }

  async deleteProgressLogsByUserAndSeed(
    userId: string,
    seedSource: string,
  ): Promise<void> {
    await this.progressCollection().deleteMany({
      user_id: new Types.ObjectId(userId),
      'payload.seed_source': seedSource,
    });
  }

  async insertProgressLogs(logs: DemoSeedProgressLogInput[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }
    await this.progressCollection().insertMany(
      logs.map((log) => ({
        user_id: new Types.ObjectId(log.user_id),
        action: log.action,
        ts: log.ts,
        payload: log.payload,
        device: log.device,
        created_at: log.created_at,
      })),
    );
  }

  async resetDemoDomanPlanGraph(
    studentId: string,
    planDate: Date,
    seedSource: string,
  ): Promise<void> {
    const studentOid = new Types.ObjectId(studentId);
    const existingPlans = await this.dailyPlansCollection()
      .find({ student_id: studentOid, plan_date: planDate })
      .toArray();

    const planIds = existingPlans
      .map((plan) => plan._id as Types.ObjectId | undefined)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const existingSessions =
      planIds.length === 0
        ? []
        : await this.sessionsCollection()
            .find({ daily_plan_id: { $in: planIds } })
            .toArray();

    const sessionIds = existingSessions
      .map((session) => session._id as Types.ObjectId | undefined)
      .filter((id): id is Types.ObjectId => Boolean(id));

    if (sessionIds.length > 0) {
      await this.sessionCardsCollection().deleteMany({
        session_id: { $in: sessionIds },
      });
      await this.exposureLogsCollection().deleteMany({
        $or: [
          { session_id: { $in: sessionIds } },
          {
            student_id: studentOid,
            'metadata.seed_source': seedSource,
          },
        ],
      });
      await this.sessionsCollection().deleteMany({
        _id: { $in: sessionIds },
      });
    } else {
      await this.exposureLogsCollection().deleteMany({
        student_id: studentOid,
        'metadata.seed_source': seedSource,
      });
    }

    if (planIds.length > 0) {
      await this.dailyPlansCollection().deleteMany({
        _id: { $in: planIds },
      });
    }
  }

  async seedTodayPlanAndSessions(
    input: SeedTodayPlanAndSessionsInput,
  ): Promise<void> {
    if (input.wordCardIds.length === 0) {
      return;
    }

    const studentOid = new Types.ObjectId(input.studentId);
    const categoryOid = new Types.ObjectId(input.categoryId);
    const now = new Date();

    const planResult = await this.dailyPlansCollection().insertOne({
      student_id: studentOid,
      plan_date: input.planDate,
      target_cards_count: Math.min(input.wordCardIds.length, 5),
      target_sessions_count: 3,
      category_id: categoryOid,
      algorithm_version: input.seedSource,
      notes: 'Auto-seeded daily plan',
      created_at: now,
      updated_at: now,
    });
    const planId = planResult.insertedId;

    const wordCardOids = input.wordCardIds.map((id) => new Types.ObjectId(id));
    const sessionOids: Types.ObjectId[] = [];
    for (let index = 1; index <= 3; index += 1) {
      const isCompleted = index === 1;
      const sessionDoc: Document = {
        student_id: studentOid,
        daily_plan_id: planId,
        session_index: index,
        category_id: categoryOid,
        mode: 'auto',
        display_ms: 2200,
        audio_mode: 'manual',
        status: isCompleted ? 'completed' : 'planned',
        created_at: now,
        updated_at: now,
      };
      if (isCompleted) {
        sessionDoc.started_at = now;
        sessionDoc.completed_at = new Date(now.getTime() + 30_000);
      }
      const result = await this.sessionsCollection().insertOne(sessionDoc);
      sessionOids.push(result.insertedId);
    }

    const sessionCardDocs: Document[] = sessionOids.flatMap(
      (sessionId, sessionIndex) =>
        wordCardOids.map((wordCardId, orderIndex) => {
          const doc: Document = {
            session_id: sessionId,
            word_card_id: wordCardId,
            order_index: orderIndex,
            created_at: now,
          };
          if (sessionIndex === 0) {
            doc.displayed_at = new Date(now.getTime() + orderIndex * 2500);
          }
          return doc;
        }),
    );
    await this.sessionCardsCollection().insertMany(sessionCardDocs);

    const completedSessionId = sessionOids[0];
    const exposureLogs: Document[] = wordCardOids.flatMap((wordCardId, index) => [
      {
        student_id: studentOid,
        session_id: completedSessionId,
        word_card_id: wordCardId,
        event_type: 'card_shown',
        event_ts: new Date(now.getTime() + index * 2500),
        display_ms: 2200,
        device: 'seed-script',
        metadata: {
          seed_source: input.seedSource,
        },
      },
      {
        student_id: studentOid,
        session_id: completedSessionId,
        word_card_id: wordCardId,
        event_type: 'card_completed',
        event_ts: new Date(now.getTime() + index * 2500 + 1200),
        display_ms: 2200,
        device: 'seed-script',
        metadata: {
          seed_source: input.seedSource,
        },
      },
    ]);
    exposureLogs.push({
      student_id: studentOid,
      session_id: completedSessionId,
      event_type: 'session_finished',
      event_ts: new Date(now.getTime() + 15_000),
      device: 'seed-script',
      metadata: {
        seed_source: input.seedSource,
      },
    });

    await this.exposureLogsCollection().insertMany(exposureLogs);
  }
}
