import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { ProgressLog } from '../../domain/interfaces/progress-log.interface';
import { IProgressRepository } from '../../domain/interfaces/progress.repository.interface';

@Injectable()
export class ProgressRepository implements IProgressRepository {
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
    return this.db().collection<Document>('progress_logs');
  }

  private toProgressLog(doc: Document): ProgressLog {
    const id = doc._id as Types.ObjectId;
    const learningUnitId = doc.learning_unit_id as Types.ObjectId | undefined;
    const sessionId = doc.session_id as Types.ObjectId | undefined;

    return {
      id: id.toHexString(),
      user_id: (doc.user_id as Types.ObjectId).toHexString(),
      learning_unit_id: learningUnitId?.toHexString(),
      session_id: sessionId?.toHexString(),
      action: doc.action as string,
      ts: doc.ts as Date,
      payload: doc.payload as Record<string, unknown> | undefined,
      device: doc.device as string | undefined,
      created_at: doc.created_at as Date,
    };
  }

  async listByUser(userId: string): Promise<ProgressLog[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    const docs = await this.coll()
      .find({ user_id: new Types.ObjectId(userId) })
      .sort({ ts: -1, created_at: -1 })
      .toArray();
    return docs.map((doc) => this.toProgressLog(doc));
  }

  async create(payload: Partial<ProgressLog>): Promise<ProgressLog> {
    if (!payload.user_id || !Types.ObjectId.isValid(payload.user_id)) {
      throw new Error('Invalid user_id for progress log');
    }

    const now = new Date();
    const doc: Document = {
      user_id: new Types.ObjectId(payload.user_id),
      action: payload.action,
      ts: payload.ts ?? now,
      created_at: now,
    };

    if (payload.learning_unit_id && Types.ObjectId.isValid(payload.learning_unit_id)) {
      doc.learning_unit_id = new Types.ObjectId(payload.learning_unit_id);
    }
    if (payload.session_id && Types.ObjectId.isValid(payload.session_id)) {
      doc.session_id = new Types.ObjectId(payload.session_id);
    }
    if (payload.payload !== undefined) {
      doc.payload = payload.payload;
    }
    if (payload.device !== undefined) {
      doc.device = payload.device;
    }

    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Progress log insert failed');
    }
    return this.toProgressLog(inserted);
  }
}
