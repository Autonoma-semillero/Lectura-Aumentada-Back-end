import { Inject, Injectable } from '@nestjs/common';
import type { Document, Filter } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import type {
  DomanStudyPlan,
  DomanStudyPlanAudienceSource,
  DomanStudyPlanAudienceStudent,
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
    const legacyStudentId = this.objectIdToString(doc.student_id);
    const groupIds = this.objectIdsToStrings(doc.group_ids);
    const storedStudentIds = this.objectIdsToStrings(doc.student_ids);
    const studentIds =
      storedStudentIds.length > 0
        ? storedStudentIds
        : legacyStudentId
          ? [legacyStudentId]
          : [];
    const storedDirectStudentIds = this.objectIdsToStrings(
      doc.direct_student_ids,
    );
    const directStudentIds =
      storedDirectStudentIds.length > 0
        ? storedDirectStudentIds
        : legacyStudentId
          ? [legacyStudentId]
          : [];
    const compatibilityStudentId =
      legacyStudentId ??
      (groupIds.length === 0 &&
      directStudentIds.length === 1 &&
      studentIds.length === 1 &&
      directStudentIds[0] === studentIds[0]
        ? studentIds[0]
        : undefined);
    const students = this.toAudienceStudents(doc.students);
    if (students.length === 0 && legacyStudentId) {
      students.push({
        student_id: legacyStudentId,
        sources: [{ type: 'direct' }],
      });
    }
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      name: doc.name as string,
      description: doc.description as string | undefined,
      student_id: compatibilityStudentId,
      group_ids: groupIds,
      direct_student_ids: directStudentIds,
      student_ids: studentIds,
      students,
      schema_version: (doc.schema_version as number | undefined) ?? 1,
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
          target_cards_count: category.target_cards_count as number | undefined,
          word_card_ids: Array.isArray(category.word_card_ids)
            ? this.objectIdsToStrings(category.word_card_ids)
            : undefined,
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
      categories: level.categories.map((category) => {
        const document: Document = {
          category_id: new Types.ObjectId(category.category_id),
        };
        if (category.target_cards_count !== undefined) {
          document.target_cards_count = category.target_cards_count;
        }
        if (category.word_card_ids !== undefined) {
          document.word_card_ids = category.word_card_ids.map(
            (id) => new Types.ObjectId(id),
          );
        }
        return document;
      }),
    };
  }

  private objectIdToString(value: unknown): string | undefined {
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
      return value.toLowerCase();
    }
    return undefined;
  }

  private objectIdsToStrings(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => this.objectIdToString(item))
      .filter((item): item is string => item !== undefined);
  }

  private toAudienceStudents(value: unknown): DomanStudyPlanAudienceStudent[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const students: DomanStudyPlanAudienceStudent[] = [];
    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }
      const document = item as Document;
      const studentId = this.objectIdToString(document.student_id);
      if (!studentId) {
        continue;
      }
      const sources: DomanStudyPlanAudienceSource[] = [];
      if (Array.isArray(document.sources)) {
        for (const rawSource of document.sources) {
          if (typeof rawSource !== 'object' || rawSource === null) {
            continue;
          }
          const source = rawSource as Document;
          if (source.type === 'direct') {
            sources.push({ type: 'direct' });
          }
          if (source.type === 'group') {
            const groupId = this.objectIdToString(source.group_id);
            if (groupId) {
              sources.push({ type: 'group', group_id: groupId });
            }
          }
        }
      }
      students.push({
        student_id: studentId,
        sources: sources.length > 0 ? sources : [{ type: 'direct' }],
      });
    }
    return students;
  }

  async findAll(filter: StudyPlanListFilter): Promise<DomanStudyPlan[]> {
    const query: Filter<Document> = {};
    if (filter.createdBy) {
      query.created_by = new Types.ObjectId(filter.createdBy);
    }
    if (filter.studentId) {
      const studentId = new Types.ObjectId(filter.studentId);
      query.$or = [{ student_ids: studentId }, { student_id: studentId }];
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
        $or: [
          { student_ids: new Types.ObjectId(studentId) },
          { student_id: new Types.ObjectId(studentId) },
        ],
        status: 'active',
        start_date: { $lte: date },
        end_date: { $gte: date },
      },
      { sort: { updated_at: -1 } },
    );
    return doc ? this.toEntity(doc) : null;
  }

  async restore(plan: DomanStudyPlan): Promise<void> {
    if (!Types.ObjectId.isValid(plan.id)) {
      return;
    }
    const $set: Document = {
      name: plan.name,
      start_date: plan.start_date,
      end_date: plan.end_date,
      sessions_per_day: plan.sessions_per_day,
      display_ms: plan.display_ms,
      audio_mode: plan.audio_mode,
      mode: plan.mode,
      status: plan.status,
      levels: plan.levels.map((level) => this.toLevelDocument(level)),
      updated_at: plan.updated_at,
    };
    const update: Document = { $set };
    if (plan.description !== undefined) {
      $set.description = plan.description;
    } else {
      // El plan original no tenía descripción: un `$set: undefined` no la
      // borraría, hay que quitarla explícitamente.
      update.$unset = { description: '' };
    }
    await this.coll().updateOne({ _id: new Types.ObjectId(plan.id) }, update);
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.coll().deleteOne({ _id: new Types.ObjectId(id) });
    return result.deletedCount > 0;
  }

  async findOverlappingActive(
    studentIds: string[],
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<DomanStudyPlan | null> {
    const validStudentIds = [...new Set(studentIds)].filter((studentId) =>
      Types.ObjectId.isValid(studentId),
    );
    if (validStudentIds.length === 0) {
      return null;
    }
    const objectIds = validStudentIds.map(
      (studentId) => new Types.ObjectId(studentId),
    );
    const query: Filter<Document> = {
      $or: [
        { student_ids: { $in: objectIds } },
        { student_id: { $in: objectIds } },
      ],
      status: 'active',
      start_date: { $lte: endDate },
      end_date: { $gte: startDate },
    };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }
    // Ordenar por `_id` hace determinista cuál solapamiento se reporta y, sobre
    // todo, permite desempatar una carrera: siempre devuelve el plan más
    // antiguo de los que solapan.
    const doc = await this.coll().findOne(query, { sort: { _id: 1 } });
    return doc ? this.toEntity(doc) : null;
  }

  async create(payload: StudyPlanInsertPayload): Promise<DomanStudyPlan> {
    const now = new Date();
    const doc: Document = {
      name: payload.name,
      group_ids: payload.groupIds.map((id) => new Types.ObjectId(id)),
      direct_student_ids: payload.directStudentIds.map(
        (id) => new Types.ObjectId(id),
      ),
      student_ids: payload.students.map(
        (student) => new Types.ObjectId(student.student_id),
      ),
      students: payload.students.map((student) => ({
        student_id: new Types.ObjectId(student.student_id),
        sources: student.sources.map((source) =>
          source.type === 'direct'
            ? { type: 'direct' }
            : {
                type: 'group',
                group_id: new Types.ObjectId(source.group_id),
              },
        ),
      })),
      schema_version: 2,
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
