import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import type {
  DomanSession,
  DomanSessionAudioMode,
  DomanSessionMode,
  DomanSessionStatus,
} from '../../domain/interfaces/doman-session.interface';
import {
  DomanSessionInsertPayload,
  DomanSessionPatchPayload,
  IDomanSessionsRepository,
} from '../../domain/interfaces/doman-sessions.repository.interface';

@Injectable()
export class DomanSessionsRepository implements IDomanSessionsRepository {
  private readonly logger = new Logger(DomanSessionsRepository.name);

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
    return this.db().collection<Document>('doman_sessions');
  }

  private toEntity(doc: Document): DomanSession | null {
    const cat = doc.category_id as Types.ObjectId | undefined;
    if (!cat) {
      const id = (doc._id as Types.ObjectId | undefined)?.toHexString();
      this.logger.warn(
        `doman_sessions document missing category_id${id ? ` (_id=${id})` : ''}`,
      );
      return null;
    }
    const _id = doc._id as Types.ObjectId;
    return {
      id: _id.toHexString(),
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      daily_plan_id: (doc.daily_plan_id as Types.ObjectId).toHexString(),
      session_index: doc.session_index as number,
      category_id: cat.toHexString(),
      display_ms: doc.display_ms as number,
      audio_mode: doc.audio_mode as DomanSessionAudioMode,
      status: doc.status as DomanSessionStatus,
      mode: doc.mode as DomanSessionMode | undefined,
      started_at: doc.started_at as Date | undefined,
      completed_at: doc.completed_at as Date | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findById(id: string): Promise<DomanSession | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toEntity(doc) : null;
  }

  async findByDailyPlanId(dailyPlanId: string): Promise<DomanSession[]> {
    if (!Types.ObjectId.isValid(dailyPlanId)) {
      return [];
    }
    const docs = await this.coll()
      .find({ daily_plan_id: new Types.ObjectId(dailyPlanId) })
      .sort({ session_index: 1 })
      .toArray();
    return docs
      .map((d) => this.toEntity(d))
      .filter((e): e is DomanSession => e !== null);
  }

  async findByStudentAndStatuses(
    studentId: string,
    statuses: DomanSessionStatus[],
  ): Promise<DomanSession[]> {
    if (!Types.ObjectId.isValid(studentId) || statuses.length === 0) {
      return [];
    }
    const docs = await this.coll()
      .find({
        student_id: new Types.ObjectId(studentId),
        status: { $in: statuses },
      })
      .sort({ updated_at: -1, session_index: 1 })
      .toArray();
    return docs
      .map((d) => this.toEntity(d))
      .filter((e): e is DomanSession => e !== null);
  }

  async create(payload: DomanSessionInsertPayload): Promise<DomanSession> {
    const now = new Date();
    const doc: Document = {
      student_id: new Types.ObjectId(payload.studentId),
      daily_plan_id: new Types.ObjectId(payload.dailyPlanId),
      session_index: payload.sessionIndex,
      category_id: new Types.ObjectId(payload.categoryId),
      display_ms: payload.displayMs,
      audio_mode: payload.audioMode,
      status: payload.status,
      created_at: now,
      updated_at: now,
    };
    if (payload.mode !== undefined) {
      doc.mode = payload.mode;
    }
    const r = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: r.insertedId });
    const entity = inserted ? this.toEntity(inserted) : null;
    if (!entity) {
      throw new Error('Doman session insert failed');
    }
    return entity;
  }

  async update(
    id: string,
    patch: DomanSessionPatchPayload,
  ): Promise<DomanSession | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const oid = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: oid });
    if (!existing) {
      return null;
    }
    const $set: Record<string, unknown> = { updated_at: new Date() };
    if (patch.categoryId !== undefined) {
      $set.category_id = new Types.ObjectId(patch.categoryId);
    }
    if (patch.displayMs !== undefined) {
      $set.display_ms = patch.displayMs;
    }
    if (patch.audioMode !== undefined) {
      $set.audio_mode = patch.audioMode;
    }
    if (patch.status !== undefined) {
      $set.status = patch.status;
    }
    if (patch.mode !== undefined) {
      $set.mode = patch.mode;
    }
    if (patch.startedAt !== undefined) {
      $set.started_at = patch.startedAt;
    }
    if (patch.completedAt !== undefined) {
      $set.completed_at = patch.completedAt;
    }
    await this.coll().updateOne({ _id: oid }, { $set });
    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.toEntity(doc) : null;
  }

  async deleteByDailyPlanId(dailyPlanId: string): Promise<void> {
    if (!Types.ObjectId.isValid(dailyPlanId)) {
      return;
    }
    await this.coll().deleteMany({ daily_plan_id: new Types.ObjectId(dailyPlanId) });
  }
}
