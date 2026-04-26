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

type SeededWordCardRef = {
  word: string;
  learningUnitId: Types.ObjectId;
};

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
    words: ['mama', 'papa', 'bebe', 'abuelo', 'hermana'],
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
    words: ['arbol', 'flor', 'nube', 'sol', 'luna'],
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

    const studentEmail =
      this.configService.get<string>('env.demoStudentEmail') ?? 'student@lectura.app';
    const student = await this.findStudentByEmail(studentEmail);
    if (!student) {
      this.logger.warn(
        `Demo content seed skipped because demo student was not found: ${studentEmail.toLowerCase()}`,
      );
      return;
    }

    const seededRefs: SeededWordCardRef[] = [];
    for (const [categoryIndex, categorySeed] of DEMO_CATEGORIES.entries()) {
      const categoryId = await this.upsertCategory(categorySeed, categoryIndex);
      for (const [wordIndex, rawWord] of categorySeed.words.entries()) {
        const normalizedWord = normalizeWordForStorage(rawWord);
        const learningUnitId = await this.upsertLearningUnit({
          word: normalizedWord,
          categoryId,
          categorySlug: categorySeed.slug,
        });
        await this.upsertWordCard({
          studentId: student._id as Types.ObjectId,
          word: normalizedWord,
          categoryId,
          learningUnitId,
          categorySlug: categorySeed.slug,
          orderIndex: wordIndex,
        });
        seededRefs.push({
          word: normalizedWord,
          learningUnitId,
        });
      }
    }

    await this.seedProgressLogs(student._id as Types.ObjectId, seededRefs);
    this.logger.log(
      `Seeded demo learning content for ${studentEmail.toLowerCase()} with ${DEMO_CATEGORIES.length} categories`,
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

  private async findStudentByEmail(email: string): Promise<Document | null> {
    return this.usersCollection().findOne({ email: email.trim().toLowerCase() });
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
            source: 'demo-seed',
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
    word: string;
    categoryId: Types.ObjectId;
    learningUnitId: Types.ObjectId;
    categorySlug: string;
    orderIndex: number;
  }): Promise<void> {
    const now = new Date();
    await this.wordCardsCollection().updateOne(
      {
        student_id: input.studentId,
        word: input.word,
      },
      {
        $set: {
          initial_letter: initialLetterFromNormalizedWord(input.word),
          audio_url: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
          category_id: input.categoryId,
          learning_unit_id: input.learningUnitId,
          status: 'active',
          language: 'es',
          times_audio_played: 0,
          updated_at: now,
        },
        $setOnInsert: {
          student_id: input.studentId,
          word: input.word,
          times_shown: input.orderIndex,
          created_at: now,
        },
      },
      { upsert: true },
    );
  }

  private async seedProgressLogs(
    studentId: Types.ObjectId,
    seededRefs: SeededWordCardRef[],
  ): Promise<void> {
    if (seededRefs.length === 0) {
      return;
    }

    const existingSeedLogCount = await this.progressCollection().countDocuments({
      user_id: studentId,
      'payload.seed_source': 'demo-content-seed',
    });
    if (existingSeedLogCount > 0) {
      return;
    }

    const now = Date.now();
    const seedLogs = seededRefs.slice(0, 3).flatMap((ref, index) => {
      const viewedAt = new Date(now - (index + 1) * 60_000);
      const completedAt = new Date(viewedAt.getTime() + 25_000);
      return [
        {
          user_id: studentId,
          learning_unit_id: ref.learningUnitId,
          action: 'word_viewed',
          ts: viewedAt,
          payload: {
            seed_source: 'demo-content-seed',
            word: ref.word,
          },
          device: 'seed-script',
          created_at: viewedAt,
        },
        {
          user_id: studentId,
          learning_unit_id: ref.learningUnitId,
          action: 'word_completed',
          ts: completedAt,
          payload: {
            seed_source: 'demo-content-seed',
            word: ref.word,
          },
          device: 'seed-script',
          created_at: completedAt,
        },
      ];
    });

    await this.progressCollection().insertMany(seedLogs);
  }
}
