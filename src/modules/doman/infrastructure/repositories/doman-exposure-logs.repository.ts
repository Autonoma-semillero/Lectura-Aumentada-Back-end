import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { DomanExposureLog } from '../../domain/interfaces/doman-exposure-log.interface';
import {
  DomanExposureInsertPayload,
  IDomanExposureLogsRepository,
} from '../../domain/interfaces/doman-exposure-logs.repository.interface';

@Injectable()
export class DomanExposureLogsRepository implements IDomanExposureLogsRepository {
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
    return this.db().collection<Document>('doman_exposure_logs');
  }

  private toEntity(doc: Document): DomanExposureLog {
    const _id = doc._id as Types.ObjectId;
    return {
      id: _id.toHexString(),
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      session_id: (doc.session_id as Types.ObjectId | undefined)?.toHexString(),
      word_card_id: (doc.word_card_id as Types.ObjectId | undefined)?.toHexString(),
      event_type: doc.event_type as DomanExposureLog['event_type'],
      event_ts: doc.event_ts as Date,
      display_ms: doc.display_ms as number | undefined,
      device: doc.device as string | undefined,
      ip: doc.ip as string | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    };
  }

  async create(payload: DomanExposureInsertPayload): Promise<DomanExposureLog> {
    const doc: Document = {
      student_id: new Types.ObjectId(payload.studentId),
      event_type: payload.eventType,
      event_ts: payload.eventTs,
    };
    if (payload.sessionId && Types.ObjectId.isValid(payload.sessionId)) {
      doc.session_id = new Types.ObjectId(payload.sessionId);
    }
    if (payload.wordCardId && Types.ObjectId.isValid(payload.wordCardId)) {
      doc.word_card_id = new Types.ObjectId(payload.wordCardId);
    }
    if (payload.displayMs !== undefined) {
      doc.display_ms = payload.displayMs;
    }
    if (payload.device !== undefined) {
      doc.device = payload.device;
    }
    if (payload.ip !== undefined) {
      doc.ip = payload.ip;
    }
    if (payload.metadata !== undefined) {
      doc.metadata = payload.metadata;
    }
    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Exposure log insert failed');
    }
    return this.toEntity(inserted);
  }

  async countByWordCardAndType(wordCardId: string, eventType: string): Promise<number> {
    if (!Types.ObjectId.isValid(wordCardId)) {
      return 0;
    }
    return this.coll().countDocuments({
      word_card_id: new Types.ObjectId(wordCardId),
      event_type: eventType,
    });
  }

  async listByStudent(studentId: string): Promise<DomanExposureLog[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      return [];
    }
    const docs = await this.coll()
      .find({ student_id: new Types.ObjectId(studentId) })
      .sort({ event_ts: -1 })
      .toArray();
    return docs.map((doc) => this.toEntity(doc));
  }
}
