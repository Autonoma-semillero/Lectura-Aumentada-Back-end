import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../database/mongodb.providers';
import {
  initialLetterFromNormalizedWord,
  normalizeWordForStorage,
} from '../../categories/application/word-normalize';

type DemoCategorySeed = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  words: string[];
};

const DEMO_SEED_SOURCE = 'demo-content-seed-v2';

const DEMO_CATEGORIES: DemoCategorySeed[] = [
  {
    name: 'Animales',
    slug: 'animales',
    description: 'Palabras sobre animales cercanos y faciles de reconocer.',
    icon: 'pets',
    words: ['gato', 'perro', 'pato', 'vaca', 'caballo'],
  },
  {
    name: 'Familia',
    slug: 'familia',
    description: 'Vocabulario basico de los integrantes de la familia.',
    icon: 'brush',
    words: ['mamá', 'papá', 'prima', 'abuelo', 'hermana'],
  },
  {
    name: 'Cocina',
    slug: 'cocina',
    description: 'Objetos y alimentos cotidianos de la cocina.',
    icon: 'restaurant',
    words: ['pan', 'leche', 'queso', 'sopa', 'arroz'],
  },
  {
    name: 'Naturaleza',
    slug: 'naturaleza',
    description: 'Elementos del entorno natural para lectura inicial.',
    icon: 'rocket_launch',
    words: ['árbol', 'flor', 'nube', 'sol', 'luna'],
  },
  {
    name: 'Juguetes',
    slug: 'juguetes',
    description: 'Palabras de juego para una practica mas divertida.',
    icon: 'sports_soccer',
    words: ['pelota', 'tren', 'carro', 'trompo', 'bloques'],
  },
];

@Injectable()
export class DemoContentSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoContentSeedService.name);

  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get<string>('env.nodeEnv') ?? 'development';
    const shouldSeed =
      nodeEnv !== 'production' &&
      (this.configService.get<string>('env.demoContentSeedEnabled') ?? 'true') ===
        'true';

    if (!shouldSeed) {
      return;
    }

    const students = await this.usersCollection()
      .find({
        roles: 'student',
        status: 'active',
        'metadata.seeded_by': 'AuthSeedService',
      })
      .toArray();

    if (students.length === 0) {
      this.logger.warn('Demo content seed skipped because no active demo student users were found');
      return;
    }

    const categoryIdsBySlug = new Map<string, Types.ObjectId>();
    for (const [categoryIndex, categorySeed] of DEMO_CATEGORIES.entries()) {
      categoryIdsBySlug.set(
        categorySeed.slug,
        await this.upsertCategory(categorySeed, categoryIndex),
      );
    }

    for (const [studentIndex, student] of students.entries()) {
      const selectedWordCardIds: Types.ObjectId[] = [];
      for (const categorySeed of DEMO_CATEGORIES) {
        const categoryId = categoryIdsBySlug.get(categorySeed.slug);
        if (!categoryId) {
          continue;
        }
        for (const [wordIndex, rawWord] of categorySeed.words.entries()) {
          const normalizedWord = normalizeWordForStorage(rawWord);
          const learningUnitId = await this.upsertLearningUnit({
            word: normalizedWord,
            categoryId,
            categorySlug: categorySeed.slug,
          });
          const wordCardId = await this.upsertWordCard({
            studentId: student._id as Types.ObjectId,
            studentIndex,
            word: normalizedWord,
            categoryId,
            learningUnitId,
            categorySlug: categorySeed.slug,
            orderIndex: wordIndex,
          });
          if (categorySeed.slug === DEMO_CATEGORIES[0].slug) {
            selectedWordCardIds.push(wordCardId);
          }
        }
      }

      await this.seedProgressLogs(student._id as Types.ObjectId, selectedWordCardIds);
      await this.seedTodayPlanAndSessions(
        student._id as Types.ObjectId,
        selectedWordCardIds,
        categoryIdsBySlug.get(DEMO_CATEGORIES[0].slug)!,
      );
    }

    this.logger.log(
      `Seeded demo learning content and Doman plans for ${students.length} students`,
    );
  }

  private db() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }
    return db;
  }

  private usersCollection() {
    return this.db().collection<Document>('users');
  }

  private categoriesCollection() {
    return this.db().collection<Document>('categories');
  }

  private wordCardsCollection() {
    return this.db().collection<Document>('doman_word_cards');
  }

  private learningUnitsCollection() {
    return this.db().collection<Document>('learning_units');
  }

  private progressCollection() {
    return this.db().collection<Document>('progress_logs');
  }

  private dailyPlansCollection() {
    return this.db().collection<Document>('doman_daily_plans');
  }

  private sessionsCollection() {
    return this.db().collection<Document>('doman_sessions');
  }

  private sessionCardsCollection() {
    return this.db().collection<Document>('doman_session_cards');
  }

  private exposureLogsCollection() {
    return this.db().collection<Document>('doman_exposure_logs');
  }

  private async upsertCategory(
    category: DemoCategorySeed,
    sortOrder: number,
  ): Promise<Types.ObjectId> {
    const now = new Date();
    await this.categoriesCollection().updateOne(
      { slug: category.slug },
      {
        $set: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          sort_order: sortOrder,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    const doc = await this.categoriesCollection().findOne({ slug: category.slug });
    if (!doc?._id) {
      throw new Error(`Failed to upsert demo category: ${category.slug}`);
    }
    return doc._id as Types.ObjectId;
  }

  private async upsertLearningUnit(input: {
    word: string;
    categoryId: Types.ObjectId;
    categorySlug: string;
  }): Promise<Types.ObjectId> {
    const markerId = `demo-${input.categorySlug}-${input.word}`;
    const now = new Date();
    await this.learningUnitsCollection().updateOne(
      { marker_id: markerId },
      {
        $set: {
          word: input.word,
          category_id: input.categoryId,
          marker_id: markerId,
          assets: {
            model_3d: `https://demo.lectura.local/models/${input.categorySlug}/${input.word}.glb`,
            audio_pronunciacion: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
          },
          metadata_accessibility: {
            source: DEMO_SEED_SOURCE,
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
    if (!doc?._id) {
      throw new Error(`Failed to upsert demo learning unit: ${markerId}`);
    }
    return doc._id as Types.ObjectId;
  }

  private async upsertWordCard(input: {
    studentId: Types.ObjectId;
    studentIndex: number;
    word: string;
    categoryId: Types.ObjectId;
    learningUnitId: Types.ObjectId;
    categorySlug: string;
    orderIndex: number;
  }): Promise<Types.ObjectId> {
    const now = new Date();
    const isSecondStudent = input.studentIndex % 2 === 1;
    const status =
      input.orderIndex >= 3 && isSecondStudent
        ? 'completed'
        : input.orderIndex === 0
          ? 'new'
          : 'active';
    const timesShown = status === 'completed' ? 3 : input.orderIndex;
    const completedAt = status === 'completed' ? now : undefined;

    const updateDoc: Record<string, unknown> = {
      $set: {
        initial_letter: initialLetterFromNormalizedWord(input.word),
        audio_url: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
        category_id: input.categoryId,
        learning_unit_id: input.learningUnitId,
        status,
        language: 'es',
        times_audio_played: 0,
        times_shown: timesShown,
        updated_at: now,
      },
      $setOnInsert: {
        student_id: input.studentId,
        word: input.word,
        created_at: now,
      },
    };
    if (completedAt) {
      (updateDoc.$set as Record<string, unknown>).completed_at = completedAt;
    } else {
      updateDoc.$unset = { completed_at: '' };
    }

    await this.wordCardsCollection().updateOne(
      {
        student_id: input.studentId,
        word: input.word,
      },
      updateDoc,
      { upsert: true },
    );

    const doc = await this.wordCardsCollection().findOne({
      student_id: input.studentId,
      word: input.word,
    });
    if (!doc?._id) {
      throw new Error(`Failed to upsert demo word card: ${input.word}`);
    }
    return doc._id as Types.ObjectId;
  }

  private async seedProgressLogs(
    studentId: Types.ObjectId,
    wordCardIds: Types.ObjectId[],
  ): Promise<void> {
    if (wordCardIds.length === 0) {
      return;
    }

    await this.progressCollection().deleteMany({
      user_id: studentId,
      'payload.seed_source': DEMO_SEED_SOURCE,
    });

    const now = Date.now();
    const seedLogs = wordCardIds.slice(0, 3).flatMap((wordCardId, index) => {
      const viewedAt = new Date(now - (index + 1) * 60_000);
      const completedAt = new Date(viewedAt.getTime() + 20_000);
      return [
        {
          user_id: studentId,
          action: 'word_viewed',
          ts: viewedAt,
          payload: {
            seed_source: DEMO_SEED_SOURCE,
            word_card_id: wordCardId.toHexString(),
          },
          device: 'seed-script',
          created_at: viewedAt,
        },
        {
          user_id: studentId,
          action: 'word_completed',
          ts: completedAt,
          payload: {
            seed_source: DEMO_SEED_SOURCE,
            word_card_id: wordCardId.toHexString(),
          },
          device: 'seed-script',
          created_at: completedAt,
        },
      ];
    });

    await this.progressCollection().insertMany(seedLogs);
  }

  private async seedTodayPlanAndSessions(
    studentId: Types.ObjectId,
    wordCardIds: Types.ObjectId[],
    categoryId: Types.ObjectId,
  ): Promise<void> {
    if (wordCardIds.length === 0) {
      return;
    }

    const planDate = new Date();
    planDate.setUTCHours(0, 0, 0, 0);

    await this.resetDemoPlanGraph(studentId, planDate);

    const now = new Date();
    const planResult = await this.dailyPlansCollection().insertOne({
      student_id: studentId,
      plan_date: planDate,
      target_cards_count: Math.min(wordCardIds.length, 5),
      target_sessions_count: 3,
      category_id: categoryId,
      algorithm_version: DEMO_SEED_SOURCE,
      notes: 'Auto-seeded daily plan',
      created_at: now,
      updated_at: now,
    });
    const planId = planResult.insertedId;

    const sessionIds: Types.ObjectId[] = [];
    for (let index = 1; index <= 3; index += 1) {
      const isCompleted = index === 1;
      const sessionDoc: Document = {
        student_id: studentId,
        daily_plan_id: planId,
        session_index: index,
        category_id: categoryId,
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
      sessionIds.push(result.insertedId);
    }

    const sessionCardDocs: Document[] = sessionIds.flatMap((sessionId, sessionIndex) =>
      wordCardIds.slice(0, 5).map((wordCardId, orderIndex) => {
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

    const completedSessionId = sessionIds[0];
    const exposureLogs: Document[] = wordCardIds.slice(0, 5).flatMap((wordCardId, index) => [
      {
        student_id: studentId,
        session_id: completedSessionId,
        word_card_id: wordCardId,
        event_type: 'card_shown',
        event_ts: new Date(now.getTime() + index * 2500),
        display_ms: 2200,
        device: 'seed-script',
        metadata: {
          seed_source: DEMO_SEED_SOURCE,
        },
      },
      {
        student_id: studentId,
        session_id: completedSessionId,
        word_card_id: wordCardId,
        event_type: 'card_completed',
        event_ts: new Date(now.getTime() + index * 2500 + 1200),
        display_ms: 2200,
        device: 'seed-script',
        metadata: {
          seed_source: DEMO_SEED_SOURCE,
        },
      },
    ]);
    exposureLogs.push({
      student_id: studentId,
      session_id: completedSessionId,
      event_type: 'session_finished',
      event_ts: new Date(now.getTime() + 15_000),
      device: 'seed-script',
      metadata: {
        seed_source: DEMO_SEED_SOURCE,
      },
    });

    await this.exposureLogsCollection().insertMany(exposureLogs);
  }

  private async resetDemoPlanGraph(
    studentId: Types.ObjectId,
    planDate: Date,
  ): Promise<void> {
    const existingPlans = await this.dailyPlansCollection()
      .find({ student_id: studentId, plan_date: planDate })
      .toArray();

    const planIds = existingPlans
      .map((plan) => plan._id as Types.ObjectId | undefined)
      .filter((id): id is Types.ObjectId => !!id);

    const existingSessions =
      planIds.length === 0
        ? []
        : await this.sessionsCollection()
            .find({ daily_plan_id: { $in: planIds } })
            .toArray();

    const sessionIds = existingSessions
      .map((session) => session._id as Types.ObjectId | undefined)
      .filter((id): id is Types.ObjectId => !!id);

    if (sessionIds.length > 0) {
      await this.sessionCardsCollection().deleteMany({
        session_id: { $in: sessionIds },
      });
      await this.exposureLogsCollection().deleteMany({
        $or: [
          { session_id: { $in: sessionIds } },
          {
            student_id: studentId,
            'metadata.seed_source': DEMO_SEED_SOURCE,
          },
        ],
      });
      await this.sessionsCollection().deleteMany({
        _id: { $in: sessionIds },
      });
    } else {
      await this.exposureLogsCollection().deleteMany({
        student_id: studentId,
        'metadata.seed_source': DEMO_SEED_SOURCE,
      });
    }

    if (planIds.length > 0) {
      await this.dailyPlansCollection().deleteMany({
        _id: { $in: planIds },
      });
    }
  }
}
