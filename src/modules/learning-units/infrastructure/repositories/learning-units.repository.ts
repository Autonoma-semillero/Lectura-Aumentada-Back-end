import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { LearningUnit } from '../../domain/interfaces/learning-unit.interface';
import { ILearningUnitsRepository } from '../../domain/interfaces/learning-units.repository.interface';

@Injectable()
export class LearningUnitsRepository implements ILearningUnitsRepository {
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

  private coll() {
    return this.db().collection<Document>('learning_units');
  }

  private toLearningUnit(doc: Document): LearningUnit {
    const id = doc._id as Types.ObjectId;
    const categoryId = doc.category_id as Types.ObjectId | undefined;
    return {
      id: id.toHexString(),
      word: doc.word as string,
      category_id: categoryId?.toHexString(),
      marker_id: doc.marker_id as string,
      assets: (doc.assets as LearningUnit['assets'] | undefined) ?? {},
      metadata_accessibility:
        doc.metadata_accessibility as Record<string, unknown> | undefined,
      language: doc.language as string | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findAll(): Promise<LearningUnit[]> {
    const docs = await this.coll().find({}).sort({ created_at: 1, word: 1 }).toArray();
    return docs.map((doc) => this.toLearningUnit(doc));
  }

  async findById(id: string): Promise<LearningUnit | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toLearningUnit(doc) : null;
  }

  async create(payload: Partial<LearningUnit>): Promise<LearningUnit> {
    const now = new Date();
    const doc: Document = {
      word: payload.word,
      marker_id: payload.marker_id,
      assets: payload.assets ?? {},
      created_at: now,
      updated_at: now,
    };

    if (payload.category_id && Types.ObjectId.isValid(payload.category_id)) {
      doc.category_id = new Types.ObjectId(payload.category_id);
    }
    if (payload.metadata_accessibility !== undefined) {
      doc.metadata_accessibility = payload.metadata_accessibility;
    }
    if (payload.language !== undefined) {
      doc.language = payload.language;
    }

    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Learning unit insert failed');
    }
    return this.toLearningUnit(inserted);
  }

  async update(
    id: string,
    payload: Partial<LearningUnit>,
  ): Promise<LearningUnit | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: objectId });
    if (!existing) {
      return null;
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (payload.word !== undefined) {
      patch.word = payload.word;
    }
    if (payload.marker_id !== undefined) {
      patch.marker_id = payload.marker_id;
    }
    if (payload.assets !== undefined) {
      patch.assets = payload.assets;
    }
    if (payload.metadata_accessibility !== undefined) {
      patch.metadata_accessibility = payload.metadata_accessibility;
    }
    if (payload.language !== undefined) {
      patch.language = payload.language;
    }
    if (payload.category_id !== undefined) {
      if (payload.category_id && Types.ObjectId.isValid(payload.category_id)) {
        patch.category_id = new Types.ObjectId(payload.category_id);
      } else {
        patch.category_id = null;
      }
    }

    await this.coll().updateOne({ _id: objectId }, { $set: patch });
    const updated = await this.coll().findOne({ _id: objectId });
    return updated ? this.toLearningUnit(updated) : null;
  }
}
