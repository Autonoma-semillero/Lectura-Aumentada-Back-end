import { Inject, Injectable } from '@nestjs/common';
import type { Document, Filter } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import {
  DomanPlanAssignment,
  DomanPlanAssignmentResult,
  DomanPlanAssignmentStatus,
  DomanPlanAssignmentStudent,
} from '../../domain/interfaces/doman-plan-assignment.interface';
import {
  IPlanAssignmentsRepository,
  PlanAssignmentCompletionPayload,
  PlanAssignmentInsertPayload,
} from '../../domain/interfaces/plan-assignments.repository.interface';

@Injectable()
export class PlanAssignmentsRepository implements IPlanAssignmentsRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  private coll() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }
    return db.collection<Document>('doman_plan_assignments');
  }

  async create(
    payload: PlanAssignmentInsertPayload,
  ): Promise<DomanPlanAssignment> {
    const now = new Date();
    const doc: Document = {
      group_ids: payload.groupIds.map((id) => new Types.ObjectId(id)),
      direct_student_ids: payload.directStudentIds.map(
        (id) => new Types.ObjectId(id),
      ),
      student_ids: payload.students.map(
        (student) => new Types.ObjectId(student.student_id),
      ),
      students: this.studentsToDocuments(payload.students),
      plan_date: payload.planDate,
      force: payload.force,
      status: 'processing',
      summary: {
        total: payload.students.length,
        generated: 0,
        existing: 0,
        failed: 0,
      },
      results: [],
      created_by: new Types.ObjectId(payload.createdBy),
      created_at: now,
      updated_at: now,
    };
    if (payload.categoryId !== undefined) {
      doc.category_id = new Types.ObjectId(payload.categoryId);
    }
    if (payload.targetCardsCount !== undefined) {
      doc.target_cards_count = payload.targetCardsCount;
    }
    if (payload.targetSessionsCount !== undefined) {
      doc.target_sessions_count = payload.targetSessionsCount;
    }
    if (payload.displayMs !== undefined) {
      doc.display_ms = payload.displayMs;
    }
    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Plan assignment insert failed');
    }
    return this.toEntity(inserted);
  }

  async complete(
    id: string,
    payload: PlanAssignmentCompletionPayload,
  ): Promise<DomanPlanAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new Types.ObjectId(id);
    await this.coll().updateOne(
      { _id: objectId },
      {
        $set: {
          status: payload.status,
          summary: payload.summary,
          results: this.resultsToDocuments(payload.results),
          updated_at: new Date(),
        },
      },
    );
    const updated = await this.coll().findOne({ _id: objectId });
    return updated ? this.toEntity(updated) : null;
  }

  async findById(id: string): Promise<DomanPlanAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toEntity(doc) : null;
  }

  async list(filters: {
    createdBy?: string;
    status?: DomanPlanAssignmentStatus;
    limit: number;
  }): Promise<DomanPlanAssignment[]> {
    const query: Filter<Document> = {};
    if (filters.createdBy !== undefined) {
      query.created_by = new Types.ObjectId(filters.createdBy);
    }
    if (filters.status !== undefined) {
      query.status = filters.status;
    }
    const documents = await this.coll()
      .find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit)
      .toArray();
    return documents.map((document) => this.toEntity(document));
  }

  private studentsToDocuments(
    students: DomanPlanAssignmentStudent[],
  ): Document[] {
    return students.map((student) => ({
      student_id: new Types.ObjectId(student.student_id),
      sources: student.sources.map((source) =>
        source.type === 'direct'
          ? { type: 'direct' }
          : { type: 'group', group_id: new Types.ObjectId(source.group_id) },
      ),
    }));
  }

  private resultsToDocuments(results: DomanPlanAssignmentResult[]): Document[] {
    return results.map((result) => {
      const document: Document = {
        student_id: new Types.ObjectId(result.student_id),
        status: result.status,
        sources: result.sources.map((source) =>
          source.type === 'direct'
            ? { type: 'direct' }
            : { type: 'group', group_id: new Types.ObjectId(source.group_id) },
        ),
      };
      if (result.plan_id !== undefined) {
        document.plan_id = new Types.ObjectId(result.plan_id);
      }
      if (result.error !== undefined) {
        document.error = result.error;
      }
      return document;
    });
  }

  private toEntity(document: Document): DomanPlanAssignment {
    const students = (document.students as Document[] | undefined) ?? [];
    const results = (document.results as Document[] | undefined) ?? [];
    const summary = document.summary as Document;
    return {
      id: (document._id as Types.ObjectId).toHexString(),
      group_ids: this.objectIdsToStrings(document.group_ids),
      direct_student_ids: this.objectIdsToStrings(document.direct_student_ids),
      student_ids: this.objectIdsToStrings(document.student_ids),
      students: students.map((student) => ({
        student_id: (student.student_id as Types.ObjectId).toHexString(),
        sources: this.sourcesToEntities(student.sources),
      })),
      category_id: (
        document.category_id as Types.ObjectId | undefined
      )?.toHexString(),
      plan_date: document.plan_date as Date,
      target_cards_count: document.target_cards_count as number | undefined,
      target_sessions_count: document.target_sessions_count as
        | number
        | undefined,
      display_ms: document.display_ms as number | undefined,
      force: document.force as boolean,
      status: document.status as DomanPlanAssignmentStatus,
      summary: {
        total: summary.total as number,
        generated: summary.generated as number,
        existing: summary.existing as number,
        failed: summary.failed as number,
      },
      results: results.map((result) => ({
        student_id: (result.student_id as Types.ObjectId).toHexString(),
        status: result.status as 'generated' | 'existing' | 'failed',
        plan_id: (result.plan_id as Types.ObjectId | undefined)?.toHexString(),
        error: result.error as string | undefined,
        sources: this.sourcesToEntities(result.sources),
      })),
      created_by: (document.created_by as Types.ObjectId).toHexString(),
      created_at: document.created_at as Date,
      updated_at: document.updated_at as Date,
    };
  }

  private objectIdsToStrings(value: unknown): string[] {
    return ((value as Types.ObjectId[] | undefined) ?? []).map((id) =>
      id.toHexString(),
    );
  }

  private sourcesToEntities(value: unknown) {
    return ((value as Document[] | undefined) ?? []).map((source) =>
      source.type === 'group'
        ? {
            type: 'group' as const,
            group_id: (source.group_id as Types.ObjectId).toHexString(),
          }
        : { type: 'direct' as const },
    );
  }
}
