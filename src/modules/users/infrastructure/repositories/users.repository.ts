import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { User, UserRole } from '../../domain/interfaces/user.interface';
import { IUsersRepository } from '../../domain/interfaces/users.repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
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
    return this.db().collection<Document>('users');
  }

  private toUser(doc: Document): User {
    const id = doc._id as Types.ObjectId;
    return {
      id: id.toHexString(),
      email: doc.email as string,
      username: doc.username as string | undefined,
      display_name: doc.display_name as string | undefined,
      roles: (doc.roles as UserRole[] | undefined) ?? [],
      status: doc.status as User['status'],
      password_hash: doc.password_hash as string | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findAll(): Promise<User[]> {
    const docs = await this.coll().find({}).sort({ created_at: -1 }).toArray();
    return docs.map((doc) => this.toUser(doc));
  }

  async findById(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const doc = await this.coll().findOne({ email: normalizedEmail });
    return doc ? this.toUser(doc) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const normalizedUsername = username.trim().toLowerCase();
    const doc = await this.coll().findOne({ username: normalizedUsername });
    return doc ? this.toUser(doc) : null;
  }

  async findStudentsByIds(ids: string[]): Promise<User[]> {
    const uniqueIds = [...new Set(ids)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (uniqueIds.length === 0) {
      return [];
    }
    const docs = await this.coll()
      .find({
        $and: [
          {
            _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
            roles: 'student',
          },
          {
            $or: [{ status: 'active' }, { status: { $exists: false } }],
          },
        ],
      })
      .sort({ display_name: 1, email: 1 })
      .toArray();
    return docs.map((doc) => this.toUser(doc));
  }

  async searchStudents(
    query: string,
    limit: number,
    offset = 0,
  ): Promise<User[]> {
    const filters: Record<string, unknown>[] = [
      { roles: 'student' },
      {
        $or: [{ status: 'active' }, { status: { $exists: false } }],
      },
    ];
    const term = query.trim();
    if (term) {
      const regex = {
        $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
      filters.push({
        $or: [{ display_name: regex }, { username: regex }, { email: regex }],
      });
    }
    const docs = await this.coll()
      .find({ $and: filters })
      .sort({ display_name: 1, email: 1, _id: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return docs.map((doc) => this.toUser(doc));
  }

  async create(payload: Partial<User>): Promise<User> {
    const now = new Date();
    const doc: Document = {
      email: payload.email?.trim().toLowerCase(),
      roles: payload.roles ?? ['student'],
      status: payload.status ?? 'active',
      created_at: now,
      updated_at: now,
    };

    // The MongoDB driver serializes explicit `undefined` values as `null`.
    // Omit optional properties instead, because the collection validator only
    // accepts their declared BSON types when the fields are present.
    if (payload.username !== undefined) {
      doc.username = payload.username.trim().toLowerCase();
    }
    if (payload.display_name !== undefined) {
      doc.display_name = payload.display_name;
    }
    if (payload.password_hash !== undefined) {
      doc.password_hash = payload.password_hash;
    }
    if (payload.metadata !== undefined) {
      doc.metadata = payload.metadata;
    }

    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('User insert failed');
    }
    return this.toUser(inserted);
  }

  async update(id: string, payload: Partial<User>): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: objectId });
    if (!existing) {
      return null;
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (payload.email !== undefined) {
      patch.email = payload.email.trim().toLowerCase();
    }
    if (payload.display_name !== undefined) {
      patch.display_name = payload.display_name;
    }
    if (payload.username !== undefined) {
      patch.username = payload.username.trim().toLowerCase();
    }
    if (payload.roles !== undefined) {
      patch.roles = payload.roles;
    }
    if (payload.status !== undefined) {
      patch.status = payload.status;
    }
    if (payload.password_hash !== undefined) {
      patch.password_hash = payload.password_hash;
    }
    if (payload.metadata !== undefined) {
      patch.metadata = payload.metadata;
    }

    await this.coll().updateOne({ _id: objectId }, { $set: patch });
    const updated = await this.coll().findOne({ _id: objectId });
    return updated ? this.toUser(updated) : null;
  }
}
