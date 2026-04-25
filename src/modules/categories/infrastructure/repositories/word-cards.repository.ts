import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import {
  WordCardInsertPayload,
  WordCardPatchPayload,
} from '../../domain/types/word-card-repository.payloads';
import { WordCardListed } from '../../domain/interfaces/word-card-listed.interface';
import { IWordCardsRepository } from '../../domain/interfaces/word-cards.repository.interface';

@Injectable()
export class WordCardsRepository implements IWordCardsRepository {
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
    return this.db().collection<Document>('doman_word_cards');
  }

  private toListed(doc: Document): WordCardListed {
    const _id = doc._id as Types.ObjectId;
    const cat = doc.category_id as Types.ObjectId | undefined;
    const lu = doc.learning_unit_id as Types.ObjectId | undefined;
    return {
      id: _id.toHexString(),
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      word: doc.word as string,
      status: doc.status as string,
      category_id: cat ? cat.toHexString() : undefined,
      learning_unit_id: lu ? lu.toHexString() : undefined,
      audio_url: doc.audio_url as string | undefined,
      language: doc.language as string | undefined,
      initial_letter: doc.initial_letter as string,
      times_shown: doc.times_shown as number,
      times_audio_played: doc.times_audio_played as number | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findById(id: string): Promise<WordCardListed | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toListed(doc) : null;
  }

  async listByCategoryId(categoryId: string): Promise<WordCardListed[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      return [];
    }
    const docs = await this.coll()
      .find({ category_id: new Types.ObjectId(categoryId) })
      .sort({ created_at: 1, word: 1 })
      .toArray();
    return docs.map((d) => this.toListed(d));
  }

  async listByStudentId(studentId: string): Promise<WordCardListed[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      return [];
    }
    const docs = await this.coll()
      .find({ student_id: new Types.ObjectId(studentId) })
      .sort({ created_at: 1, word: 1 })
      .toArray();
    return docs.map((d) => this.toListed(d));
  }

  async listByStudentAndCategory(
    studentId: string,
    categoryId: string,
  ): Promise<WordCardListed[]> {
    if (
      !Types.ObjectId.isValid(studentId) ||
      !Types.ObjectId.isValid(categoryId)
    ) {
      return [];
    }
    const docs = await this.coll()
      .find({
        student_id: new Types.ObjectId(studentId),
        category_id: new Types.ObjectId(categoryId),
      })
      .sort({ created_at: 1, word: 1 })
      .toArray();
    return docs.map((d) => this.toListed(d));
  }

  async countWordCardsByCategoryForStudent(
    studentId: string,
  ): Promise<{ categoryId: string; count: number }[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      return [];
    }
    const sid = new Types.ObjectId(studentId);
    const rows = await this.coll()
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            student_id: sid,
            category_id: { $exists: true, $nin: [null] },
          },
        },
        { $group: { _id: '$category_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();
    return rows.map((r) => ({
      categoryId: r._id.toHexString(),
      count: r.count,
    }));
  }

  async create(payload: WordCardInsertPayload): Promise<WordCardListed> {
    const now = new Date();
    const doc: Document = {
      student_id: new Types.ObjectId(payload.studentId),
      word: payload.word,
      initial_letter: payload.initialLetter,
      audio_url: payload.audioUrl,
      category_id: new Types.ObjectId(payload.categoryId),
      status: payload.status,
      times_shown: 0,
      times_audio_played: 0,
      created_at: now,
      updated_at: now,
    };
    if (payload.language !== undefined && payload.language !== '') {
      doc.language = payload.language;
    }
    if (payload.learningUnitId !== undefined) {
      doc.learning_unit_id = new Types.ObjectId(payload.learningUnitId);
    }
    const r = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: r.insertedId });
    if (!inserted) {
      throw new Error('Word card insert failed');
    }
    return this.toListed(inserted);
  }

  async update(
    id: string,
    patch: WordCardPatchPayload,
  ): Promise<WordCardListed | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const oid = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: oid });
    if (!existing) {
      return null;
    }
    const $set: Record<string, unknown> = { updated_at: new Date() };
    if (patch.word !== undefined) {
      $set.word = patch.word;
    }
    if (patch.initialLetter !== undefined) {
      $set.initial_letter = patch.initialLetter;
    }
    if (patch.audioUrl !== undefined) {
      $set.audio_url = patch.audioUrl;
    }
    if (patch.categoryId !== undefined) {
      $set.category_id = new Types.ObjectId(patch.categoryId);
    }
    if (patch.status !== undefined) {
      $set.status = patch.status;
    }
    if (patch.language !== undefined) {
      $set.language = patch.language;
    }
    if (patch.learningUnitId !== undefined) {
      $set.learning_unit_id = new Types.ObjectId(patch.learningUnitId);
    }
    await this.coll().updateOne({ _id: oid }, { $set });
    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.toListed(doc) : null;
  }

  async updateCategoryId(
    id: string,
    categoryId: string | null,
  ): Promise<WordCardListed | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const oid = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: oid });
    if (!existing) {
      return null;
    }
    if (categoryId === null) {
      await this.coll().updateOne(
        { _id: oid },
        { $unset: { category_id: '' }, $set: { updated_at: new Date() } },
      );
    } else {
      await this.coll().updateOne(
        { _id: oid },
        {
          $set: {
            category_id: new Types.ObjectId(categoryId),
            updated_at: new Date(),
          },
        },
      );
    }
    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.toListed(doc) : null;
  }
}
