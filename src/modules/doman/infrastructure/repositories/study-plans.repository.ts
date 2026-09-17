import { Inject, Injectable } from '@nestjs/common';
import type { Document, Filter } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import type {
  DomanStudyPlan,
  DomanStudyPlanCategory,
  DomanStudyPlanLevel,
} from '../../domain/interfaces/doman-study-plan.interface';
import type {
  IStudyPlansRepository,
  StudyPlanInsertPayload,
  StudyPlanListFilter,
  StudyPlanPatchPayload,
} from '../../domain/interfaces/study-plans.repository.interface';

@Injectable()
export class StudyPlansRepository implements IStudyPlansRepository {
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
    return this.db().collection<Document>('doman_study_plans');
  }

  private toEntity(doc: Document): DomanStudyPlan {
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      name: doc.name as string,
      description: doc.description as string | undefined,
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      start_date: doc.start_date as Date,
      end_date: doc.end_date as Date,
      sessions_per_day: doc.sessions_per_day as number,
      display_ms: doc.display_ms as number,
      audio_mode: doc.audio_mode as DomanStudyPlan['audio_mode'],
      mode: doc.mode as DomanStudyPlan['mode'],
      status: doc.status as DomanStudyPlan['status'],
      levels: ((doc.levels as Document[] | undefined) ?? []).map((level) =>
        this.toLevel(level),
      ),
      created_by: (doc.created_by as Types.ObjectId).toHexString(),
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  private toLevel(level: Document): DomanStudyPlanLevel {
    return {
      id: (level._id as Types.ObjectId).toHexString(),
      name: level.name as string,
      order_index: level.order_index as number,
      start_date: level.start_date as Date,
      end_date: level.end_date as Date,
      categories: ((level.categories as Document[] | undefined) ?? []).map(
        (category): DomanStudyPlanCategory => ({
          category_id: (category.category_id as Types.ObjectId).toHexString(),
          word_card_ids: (
            (category.word_card_ids as Types.ObjectId[] | undefined) ?? []
          ).map((id) => id.toHexString()),
        }),
      ),
    };
  }

  private toLevelDocument(level: DomanStudyPlanLevel): Document {
    return {
      _id: new Types.ObjectId(level.id),
      name: level.name,
      order_index: level.order_index,
      start_date: level.start_date,
      end_date: level.end_date,
      categories: level.categories.map((category) => ({
        category_id: new Types.ObjectId(category.category_id),
        word_card_ids: category.word_card_ids.map(
          (id) => new Types.ObjectId(id),
        ),
      })),
    };
  }

  async findAll(filter: StudyPlanListFilter): Promise<DomanStudyPlan[]> {
    const query: Filter<Document> = {};
    if (filter.createdBy) {
      query.created_by = new Types.ObjectId(filter.createdBy);
    }
    if (filter.studentId) {
      query.student_id = new Types.ObjectId(filter.studentId);
    }
    if (filter.status) {
      query.status = filter.status;
    } else {
      query.status = { $ne: 'archived' };
    }
    const docs = await this.coll()
      .find(query)
      .sort({ start_date: -1, created_at: -1 })
      .toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findById(id: string): Promise<DomanStudyPlan | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toEntity(doc) : null;
  }

  async findActiveForStudentAndDate(
    studentId: string,
    date: Date,
  ): Promise<DomanStudyPlan | null> {
    if (!Types.ObjectId.isValid(studentId)) {
      return null;
    }
    const doc = await this.coll().findOne(
      {
        student_id: new Types.ObjectId(studentId),
        status: 'active',
        start_date: { $lte: date },
        end_date: { $gte: date },
      },
      { sort: { updated_at: -1 } },
    );
    return doc ? this.toEntity(doc) : null;
  }

  async findOverlappingActive(
    studentId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<DomanStudyPlan | null> {
    if (!Types.ObjectId.isValid(studentId)) {
      return null;
    }
    const query: Filter<Document> = {
      student_id: new Types.ObjectId(studentId),
      status: 'active',
      start_date: { $lte: endDate },
      end_date: { $gte: startDate },
    };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const doc = await this.coll().findOne(query);
    return doc ? this.toEntity(doc) : null;
  }

  async create(payload: StudyPlanInsertPayload): Promise<DomanStudyPlan> {
    const now = new Date();
    const doc: Document = {
      name: payload.name,
      student_id: new Types.ObjectId(payload.studentId),
      start_date: payload.startDate,
      end_date: payload.endDate,
      sessions_per_day: payload.sessionsPerDay,
      display_ms: payload.displayMs,
      audio_mode: payload.audioMode,
      mode: payload.mode,
      status: payload.status,
      levels: payload.levels.map((level) => this.toLevelDocument(level)),
      created_by: new Types.ObjectId(payload.createdBy),
      created_at: now,
      updated_at: now,
    };
    if (payload.description !== undefined) {
      doc.description = payload.description;
    }
    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Study plan insert failed');
    }
    return this.toEntity(inserted);
  }

  async update(
    id: string,
    patch: StudyPlanPatchPayload,
  ): Promise<DomanStudyPlan | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const $set: Document = { updated_at: new Date() };
    if (patch.name !== undefined) $set.name = patch.name;
    if (patch.description !== undefined) $set.description = patch.description;
    if (patch.studentId !== undefined) {
      $set.student_id = new Types.ObjectId(patch.studentId);
    }
    if (patch.startDate !== undefined) $set.start_date = patch.startDate;
    if (patch.endDate !== undefined) $set.end_date = patch.endDate;
    if (patch.sessionsPerDay !== undefined) {
      $set.sessions_per_day = patch.sessionsPerDay;
    }
    if (patch.displayMs !== undefined) $set.display_ms = patch.displayMs;
    if (patch.audioMode !== undefined) $set.audio_mode = patch.audioMode;
    if (patch.mode !== undefined) $set.mode = patch.mode;
    if (patch.status !== undefined) $set.status = patch.status;
    if (patch.levels !== undefined) {
      $set.levels = patch.levels.map((level) => this.toLevelDocument(level));
    }
    const objectId = new Types.ObjectId(id);
    const result = await this.coll().findOneAndUpdate(
      { _id: objectId },
      { $set },
      { returnDocument: 'after' },
    );
    return result ? this.toEntity(result) : null;
  }
}
