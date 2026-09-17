import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { StudentGroupMembership } from '../../domain/interfaces/student-group-membership.interface';
import { StudentGroup } from '../../domain/interfaces/student-group.interface';
import {
  CreateStudentGroupPayload,
  GroupsListFilter,
  IGroupsRepository,
} from '../../domain/interfaces/groups.repository.interface';

@Injectable()
export class GroupsRepository implements IGroupsRepository {
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

  private groups() {
    return this.db().collection<Document>('student_groups');
  }

  private memberships() {
    return this.db().collection<Document>('student_group_memberships');
  }

  private toGroup(doc: Document): StudentGroup {
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      name: doc.name as string,
      normalized_name: doc.normalized_name as string,
      description: doc.description as string | undefined,
      teacher_id: (doc.teacher_id as Types.ObjectId).toHexString(),
      status: doc.status as StudentGroup['status'],
      created_by: (doc.created_by as Types.ObjectId).toHexString(),
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  private toMembership(doc: Document): StudentGroupMembership {
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      group_id: (doc.group_id as Types.ObjectId).toHexString(),
      student_id: (doc.student_id as Types.ObjectId).toHexString(),
      added_by: (doc.added_by as Types.ObjectId).toHexString(),
      created_at: doc.created_at as Date,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findAll(filter: GroupsListFilter): Promise<StudentGroup[]> {
    const query: Record<string, unknown> = {};
    if (filter.teacher_id) {
      query.teacher_id = new Types.ObjectId(filter.teacher_id);
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.q) {
      query.normalized_name = {
        $regex: this.escapeRegex(filter.q),
        $options: 'i',
      };
    }

    let cursor = this.groups().find(query).sort({ normalized_name: 1, _id: 1 });
    if (filter.limit !== undefined) {
      cursor = cursor.limit(filter.limit);
    }
    const docs = await cursor.toArray();
    return docs.map((doc) => this.toGroup(doc));
  }

  async findById(id: string): Promise<StudentGroup | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.groups().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toGroup(doc) : null;
  }

  async findByIds(ids: string[]): Promise<StudentGroup[]> {
    const uniqueIds = [...new Set(ids)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (uniqueIds.length === 0) {
      return [];
    }
    const docs = await this.groups()
      .find({
        _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      })
      .toArray();
    return docs.map((doc) => this.toGroup(doc));
  }

  async create(payload: CreateStudentGroupPayload): Promise<StudentGroup> {
    const now = new Date();
    const doc: Record<string, unknown> = {
      name: payload.name,
      normalized_name: payload.normalized_name,
      teacher_id: new Types.ObjectId(payload.teacher_id),
      status: payload.status,
      created_by: new Types.ObjectId(payload.created_by),
      created_at: now,
      updated_at: now,
    };
    if (payload.description !== undefined) {
      doc.description = payload.description;
    }
    const result = await this.groups().insertOne(doc);
    const inserted = await this.groups().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Student group insert failed');
    }
    return this.toGroup(inserted);
  }

  async update(
    id: string,
    payload: Partial<
      Pick<StudentGroup, 'name' | 'normalized_name' | 'description' | 'status'>
    >,
  ): Promise<StudentGroup | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (payload.name !== undefined) {
      patch.name = payload.name;
    }
    if (payload.normalized_name !== undefined) {
      patch.normalized_name = payload.normalized_name;
    }
    if (payload.description !== undefined) {
      patch.description = payload.description;
    }
    if (payload.status !== undefined) {
      patch.status = payload.status;
    }

    const result = await this.groups().findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $set: patch },
      { returnDocument: 'after' },
    );
    return result ? this.toGroup(result) : null;
  }

  async findMembershipsByGroupIds(
    groupIds: string[],
  ): Promise<StudentGroupMembership[]> {
    const uniqueIds = [...new Set(groupIds)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (uniqueIds.length === 0) {
      return [];
    }
    const docs = await this.memberships()
      .find({
        group_id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      })
      .sort({ created_at: 1, _id: 1 })
      .toArray();
    return docs.map((doc) => this.toMembership(doc));
  }

  async findMembershipsByStudentIds(
    studentIds: string[],
    groupIds?: string[],
  ): Promise<StudentGroupMembership[]> {
    const uniqueIds = [...new Set(studentIds)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (uniqueIds.length === 0) {
      return [];
    }
    const query: Record<string, unknown> = {
      student_id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
    };
    if (groupIds !== undefined) {
      const uniqueGroupIds = [...new Set(groupIds)].filter((id) =>
        Types.ObjectId.isValid(id),
      );
      if (uniqueGroupIds.length === 0) {
        return [];
      }
      query.group_id = {
        $in: uniqueGroupIds.map((id) => new Types.ObjectId(id)),
      };
    }
    const docs = await this.memberships()
      .find(query)
      .sort({ created_at: 1, _id: 1 })
      .toArray();
    return docs.map((doc) => this.toMembership(doc));
  }

  async addMemberships(
    groupId: string,
    studentIds: string[],
    addedBy: string,
  ): Promise<void> {
    const uniqueStudentIds = [...new Set(studentIds)];
    if (uniqueStudentIds.length === 0) {
      return;
    }
    const groupObjectId = new Types.ObjectId(groupId);
    const addedByObjectId = new Types.ObjectId(addedBy);
    const createdAt = new Date();
    await this.memberships().bulkWrite(
      uniqueStudentIds.map((studentId) => {
        const studentObjectId = new Types.ObjectId(studentId);
        return {
          updateOne: {
            filter: {
              group_id: groupObjectId,
              student_id: studentObjectId,
            },
            update: {
              $setOnInsert: {
                group_id: groupObjectId,
                student_id: studentObjectId,
                added_by: addedByObjectId,
                created_at: createdAt,
              },
            },
            upsert: true,
          },
        };
      }),
      { ordered: false },
    );
  }

  async removeMembership(groupId: string, studentId: string): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(groupId) ||
      !Types.ObjectId.isValid(studentId)
    ) {
      return false;
    }
    const result = await this.memberships().deleteOne({
      group_id: new Types.ObjectId(groupId),
      student_id: new Types.ObjectId(studentId),
    });
    return result.deletedCount === 1;
  }

  async removeMembershipsByGroupId(groupId: string): Promise<void> {
    if (!Types.ObjectId.isValid(groupId)) {
      return;
    }
    await this.memberships().deleteMany({
      group_id: new Types.ObjectId(groupId),
    });
  }
}
