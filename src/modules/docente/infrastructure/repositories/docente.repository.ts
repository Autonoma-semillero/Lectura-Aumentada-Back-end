import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import type {
  CategoryProgressSummary,
  CompletedCardItem,
  CompletedCardsPaginated,
  StudentSummary,
} from '../../domain/interfaces/docente-progress.interface';
import type {
  CompletedCardsFilter,
  IDocenteRepository,
} from '../../domain/interfaces/docente.repository.interface';

@Injectable()
export class DocenteRepository implements IDocenteRepository {
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

  private wordCardsColl() {
    return this.db().collection<Document>('doman_word_cards');
  }

  private usersColl() {
    return this.db().collection<Document>('users');
  }

  async getStudentProgressByCategory(studentId: string): Promise<CategoryProgressSummary[]> {
    const sid = new Types.ObjectId(studentId);

    const docs = await this.wordCardsColl()
      .aggregate<Document>([
        { $match: { student_id: sid } },
        {
          $group: {
            _id: '$category_id',
            total: { $sum: 1 },
            new_count: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
            active_count: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completed_count: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            archived_count: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
          },
        },
        { $match: { _id: { $ne: null } } },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category_doc',
          },
        },
        { $match: { 'category_doc.0': { $exists: true } } },
        {
          $addFields: {
            category: { $arrayElemAt: ['$category_doc', 0] },
            non_archived: { $subtract: ['$total', '$archived_count'] },
          },
        },
        {
          $addFields: {
            phase2Ready: {
              $and: [
                { $gt: ['$non_archived', 0] },
                { $eq: ['$new_count', 0] },
                { $eq: ['$active_count', 0] },
              ],
            },
          },
        },
        { $project: { category_doc: 0, non_archived: 0 } },
        { $sort: { 'category.sort_order': 1 } },
      ])
      .toArray();

    return docs.map((doc) => this.toProgressSummary(doc));
  }

  async getCompletedCards(filter: CompletedCardsFilter): Promise<CompletedCardsPaginated> {
    const sid = new Types.ObjectId(filter.studentId);
    const skip = (filter.page - 1) * filter.limit;

    const matchStage: Document = { student_id: sid, status: 'completed' };
    if (filter.categoryId) {
      matchStage.category_id = new Types.ObjectId(filter.categoryId);
    }

    const results = await this.wordCardsColl()
      .aggregate<Document>([
        { $match: matchStage },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $sort: { completed_at: -1 } },
              { $skip: skip },
              { $limit: filter.limit },
              {
                $lookup: {
                  from: 'categories',
                  localField: 'category_id',
                  foreignField: '_id',
                  as: 'category_doc',
                },
              },
              {
                $addFields: {
                  category: { $arrayElemAt: ['$category_doc', 0] },
                },
              },
              { $project: { category_doc: 0 } },
            ],
          },
        },
      ])
      .toArray();

    const raw = results[0] as { metadata: { total: number }[]; data: Document[] } | undefined;
    const total = raw?.metadata?.[0]?.total ?? 0;
    const data = (raw?.data ?? []).map((doc) => this.toCompletedCard(doc));

    return { data, total, page: filter.page, limit: filter.limit };
  }

  async studentExists(studentId: string): Promise<boolean> {
    const doc = await this.usersColl().findOne(
      { _id: new Types.ObjectId(studentId), roles: 'student' },
      { projection: { _id: 1 } },
    );
    return doc !== null;
  }

  async listStudents(): Promise<StudentSummary[]> {
    const docs = await this.usersColl()
      .find({ roles: 'student', status: { $ne: 'disabled' } })
      .sort({ display_name: 1 })
      .project({ _id: 1, email: 1, display_name: 1 })
      .toArray();

    return docs.map((doc) => ({
      id: (doc._id as Types.ObjectId).toHexString(),
      email: doc.email as string,
      displayName: doc.display_name as string | undefined,
    }));
  }

  private toProgressSummary(doc: Document): CategoryProgressSummary {
    const category = doc.category as Document;
    return {
      categoryId: (doc._id as Types.ObjectId).toHexString(),
      categoryName: category.name as string,
      categorySlug: category.slug as string,
      total: doc.total as number,
      byStatus: {
        new: doc.new_count as number,
        active: doc.active_count as number,
        completed: doc.completed_count as number,
        archived: doc.archived_count as number,
      },
      phase2Ready: doc.phase2Ready as boolean,
    };
  }

  private toCompletedCard(doc: Document): CompletedCardItem {
    const category = doc.category as Document | undefined;
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      word: doc.word as string,
      audioUrl: doc.audio_url as string | undefined,
      category: category
        ? {
            id: (category._id as Types.ObjectId).toHexString(),
            name: category.name as string,
            slug: category.slug as string,
          }
        : { id: '', name: '', slug: '' },
      timesShown: (doc.times_shown as number) ?? 0,
      timesAudioPlayed: (doc.times_audio_played as number) ?? 0,
      completedAt: doc.completed_at as Date | undefined,
    };
  }
}
