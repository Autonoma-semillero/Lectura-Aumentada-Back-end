import { Inject, Injectable } from '@nestjs/common';
import type { Collection, Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import {
  DemoProgressLogInput,
  IDemoContentSeedRepository,
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

  async findUserIdByEmail(email: string): Promise<string | null> {
    const doc = await this.usersCollection().findOne({ email: email.trim().toLowerCase() });
    const id = doc?._id as Types.ObjectId | undefined;
    return id ? id.toHexString() : null;
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
    const markerId = `demo-${input.categorySlug}-${input.word}`;
    const now = new Date();
    await this.learningUnitsCollection().updateOne(
      { marker_id: markerId },
      {
        $set: {
          word: input.word,
          category_id: new Types.ObjectId(input.categoryId),
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
    const id = doc?._id as Types.ObjectId | undefined;
    if (!id) {
      throw new Error(`Failed to upsert demo learning unit: ${markerId}`);
    }
    return id.toHexString();
  }

  async upsertWordCard(input: UpsertDemoWordCardInput): Promise<void> {
    const now = new Date();
    await this.wordCardsCollection().updateOne(
      {
        student_id: new Types.ObjectId(input.studentId),
        word: input.word,
      },
      {
        $set: {
          initial_letter: input.initialLetter,
          audio_url: `https://demo.lectura.local/audio/${input.categorySlug}/${input.word}.mp3`,
          category_id: new Types.ObjectId(input.categoryId),
          learning_unit_id: new Types.ObjectId(input.learningUnitId),
          status: 'active',
          language: 'es',
          times_audio_played: 0,
          updated_at: now,
        },
        $setOnInsert: {
          student_id: new Types.ObjectId(input.studentId),
          word: input.word,
          times_shown: input.orderIndex,
          created_at: now,
        },
      },
      { upsert: true },
    );
  }

  async countSeedProgressLogs(userId: string): Promise<number> {
    return this.progressCollection().countDocuments({
      user_id: new Types.ObjectId(userId),
      'payload.seed_source': 'demo-content-seed',
    });
  }

  async insertProgressLogs(logs: DemoProgressLogInput[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }
    await this.progressCollection().insertMany(
      logs.map((log) => ({
        user_id: new Types.ObjectId(log.userId),
        learning_unit_id: new Types.ObjectId(log.learningUnitId),
        action: log.action,
        ts: log.ts,
        payload: {
          seed_source: 'demo-content-seed',
          word: log.word,
        },
        device: 'seed-script',
        created_at: log.ts,
      })),
    );
  }
}
