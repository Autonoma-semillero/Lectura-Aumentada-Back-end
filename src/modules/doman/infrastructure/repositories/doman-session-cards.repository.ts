import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { DomanSessionCard } from '../../domain/interfaces/doman-session-card.interface';
import {
  DomanSessionCardInsertPayload,
  IDomanSessionCardsRepository,
} from '../../domain/interfaces/doman-session-cards.repository.interface';

@Injectable()
export class DomanSessionCardsRepository implements IDomanSessionCardsRepository {
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
    return this.db().collection<Document>('doman_session_cards');
  }

  private wordCardsColl() {
    return this.db().collection<Document>('doman_word_cards');
  }

  private toEntity(doc: Document): DomanSessionCard {
    const _id = doc._id as Types.ObjectId;
    const wordCard = doc.word_card as Document | undefined;
    return {
      id: _id.toHexString(),
      session_id: (doc.session_id as Types.ObjectId).toHexString(),
      word_card_id: (doc.word_card_id as Types.ObjectId).toHexString(),
      order_index: doc.order_index as number,
      displayed_at: doc.displayed_at as Date | undefined,
      audio_played_at: doc.audio_played_at as Date | undefined,
      created_at: doc.created_at as Date,
      word_card: wordCard
        ? {
            id: ((wordCard._id as Types.ObjectId) || new Types.ObjectId()).toHexString(),
            student_id: (wordCard.student_id as Types.ObjectId).toHexString(),
            word: wordCard.word as string,
            status: wordCard.status as string,
            category_id: (wordCard.category_id as Types.ObjectId | undefined)?.toHexString(),
            learning_unit_id: (wordCard.learning_unit_id as Types.ObjectId | undefined)?.toHexString(),
            audio_url: wordCard.audio_url as string | undefined,
            language: wordCard.language as string | undefined,
            initial_letter: wordCard.initial_letter as string,
            times_shown: wordCard.times_shown as number,
            times_audio_played: wordCard.times_audio_played as number | undefined,
            created_at: wordCard.created_at as Date,
            updated_at: wordCard.updated_at as Date,
          }
        : undefined,
    };
  }

  async listBySessionId(sessionId: string): Promise<DomanSessionCard[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      return [];
    }
    const sid = new Types.ObjectId(sessionId);
    const docs = await this.coll()
      .aggregate<Document>([
        { $match: { session_id: sid } },
        { $sort: { order_index: 1 } },
        {
          $lookup: {
            from: 'doman_word_cards',
            localField: 'word_card_id',
            foreignField: '_id',
            as: 'word_card_docs',
          },
        },
        {
          $addFields: {
            word_card: { $arrayElemAt: ['$word_card_docs', 0] },
          },
        },
        { $project: { word_card_docs: 0 } },
      ])
      .toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findBySessionIdAndWordCardId(
    sessionId: string,
    wordCardId: string,
  ): Promise<DomanSessionCard | null> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(wordCardId)) {
      return null;
    }
    const doc = await this.coll().findOne({
      session_id: new Types.ObjectId(sessionId),
      word_card_id: new Types.ObjectId(wordCardId),
    });
    return doc ? this.toEntity(doc) : null;
  }

  async createMany(payloads: DomanSessionCardInsertPayload[]): Promise<void> {
    if (payloads.length === 0) {
      return;
    }
    const now = new Date();
    await this.coll().insertMany(
      payloads.map((payload) => ({
        session_id: new Types.ObjectId(payload.sessionId),
        word_card_id: new Types.ObjectId(payload.wordCardId),
        order_index: payload.orderIndex,
        created_at: now,
      })),
    );
  }

  async touchDisplayedAt(sessionId: string, wordCardId: string, when: Date): Promise<void> {
    await this.coll().updateOne(
      {
        session_id: new Types.ObjectId(sessionId),
        word_card_id: new Types.ObjectId(wordCardId),
      },
      { $set: { displayed_at: when } },
    );
  }

  async touchAudioPlayedAt(sessionId: string, wordCardId: string, when: Date): Promise<void> {
    await this.coll().updateOne(
      {
        session_id: new Types.ObjectId(sessionId),
        word_card_id: new Types.ObjectId(wordCardId),
      },
      { $set: { audio_played_at: when } },
    );
  }

  async deleteBySessionIds(sessionIds: string[]): Promise<void> {
    const validIds = sessionIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return;
    }
    await this.coll().deleteMany({
      session_id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
    });
  }
}
