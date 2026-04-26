import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { DomanDailyPlan } from '../../domain/interfaces/doman-daily-plan.interface';
import {
  DailyPlanInsertPayload,
  DailyPlanPatchPayload,
  IDailyPlansRepository,
} from '../../domain/interfaces/daily-plans.repository.interface';

@Injectable()
export class DailyPlansRepository implements IDailyPlansRepository {
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
    return this.db().collection<Document>('doman_daily_plans');
  }

  private toEntity(doc: Document): DomanDailyPlan | null {
    const cat = doc.category_id as Types.ObjectId | undefined;
    if (!cat) {
      return null;
    }
    const _id = doc._id as Types.ObjectId;
    return {
      id: _id.toHexString(),
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      plan_date: doc.plan_date as Date,
      target_cards_count: doc.target_cards_count as number,
      target_sessions_count: doc.target_sessions_count as number,
      category_id: cat.toHexString(),
      algorithm_version: doc.algorithm_version as string | undefined,
      notes: doc.notes as string | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findById(id: string): Promise<DomanDailyPlan | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toEntity(doc) : null;
  }

  async findByStudentAndPlanDate(
    studentId: string,
    planDateUtcMidnight: Date,
    categoryId?: string,
  ): Promise<DomanDailyPlan | null> {
    if (!Types.ObjectId.isValid(studentId)) {
      return null;
    }
    const filter: Record<string, unknown> = {
      student_id: new Types.ObjectId(studentId),
      plan_date: planDateUtcMidnight,
    };
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.category_id = new Types.ObjectId(categoryId);
    }
    const doc = await this.coll().findOne(filter);
    return doc ? this.toEntity(doc) : null;
  }

  async findByStudentAndDateRange(
    studentId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<DomanDailyPlan[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      return [];
    }
    const docs = await this.coll()
      .find({
        student_id: new Types.ObjectId(studentId),
        plan_date: { $gte: fromUtc, $lte: toUtc },
      })
      .sort({ plan_date: 1 })
      .toArray();
    return docs
      .map((d) => this.toEntity(d))
      .filter((e): e is DomanDailyPlan => e !== null);
  }

  async create(payload: DailyPlanInsertPayload): Promise<DomanDailyPlan> {
    const now = new Date();
    const doc: Document = {
      student_id: new Types.ObjectId(payload.studentId),
      plan_date: payload.planDateUtcMidnight,
      target_cards_count: payload.targetCardsCount,
      target_sessions_count: payload.targetSessionsCount,
      category_id: new Types.ObjectId(payload.categoryId),
      created_at: now,
      updated_at: now,
    };
    if (payload.algorithmVersion !== undefined) {
      doc.algorithm_version = payload.algorithmVersion;
    }
    if (payload.notes !== undefined) {
      doc.notes = payload.notes;
    }
    const r = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: r.insertedId });
    const entity = inserted ? this.toEntity(inserted) : null;
    if (!entity) {
      throw new Error('Daily plan insert failed');
    }
    return entity;
  }

  async update(
    id: string,
    patch: DailyPlanPatchPayload,
  ): Promise<DomanDailyPlan | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const oid = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: oid });
    if (!existing) {
      return null;
    }
    const $set: Record<string, unknown> = { updated_at: new Date() };
    if (patch.targetCardsCount !== undefined) {
      $set.target_cards_count = patch.targetCardsCount;
    }
    if (patch.targetSessionsCount !== undefined) {
      $set.target_sessions_count = patch.targetSessionsCount;
    }
    if (patch.categoryId !== undefined) {
      $set.category_id = new Types.ObjectId(patch.categoryId);
    }
    if (patch.algorithmVersion !== undefined) {
      $set.algorithm_version = patch.algorithmVersion;
    }
    if (patch.notes !== undefined) {
      $set.notes = patch.notes;
    }
    await this.coll().updateOne({ _id: oid }, { $set });
    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.toEntity(doc) : null;
  }
}
