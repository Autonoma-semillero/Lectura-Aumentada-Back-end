import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { Category } from '../../domain/interfaces/category.interface';
import {
  CategoryParentFilter,
  ICategoriesRepository,
} from '../../domain/interfaces/categories.repository.interface';

@Injectable()
export class CategoriesRepository implements ICategoriesRepository {
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
    return this.db().collection<Document>('categories');
  }

  private parentMatch(filter: CategoryParentFilter): Record<string, unknown> {
    if (filter.parent_id != null && filter.parent_id !== '') {
      return { parent_id: new Types.ObjectId(filter.parent_id) };
    }
    return {
      $or: [{ parent_id: { $exists: false } }, { parent_id: null }],
    };
  }

  private toCategory(doc: Document): Category {
    const _id = doc._id as Types.ObjectId;
    const pid = doc.parent_id as Types.ObjectId | null | undefined;
    return {
      id: _id.toHexString(),
      name: doc.name as string,
      slug: doc.slug as string,
      description: doc.description as string | undefined,
      parent_id: pid ? pid.toHexString() : undefined,
      sort_order: doc.sort_order as number | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findAll(filter: CategoryParentFilter): Promise<Category[]> {
    const q = this.parentMatch(filter);
    const docs = await this.coll()
      .find(q)
      .sort({ sort_order: 1, name: 1 })
      .toArray();
    return docs.map((d) => this.toCategory(d));
  }

  async findById(id: string): Promise<Category | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toCategory(doc) : null;
  }

  async findByIds(ids: string[]): Promise<Category[]> {
    const unique = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
    if (unique.length === 0) {
      return [];
    }
    const oids = unique.map((id) => new Types.ObjectId(id));
    const docs = await this.coll()
      .find({ _id: { $in: oids } })
      .sort({ sort_order: 1, name: 1 })
      .toArray();
    return docs.map((d) => this.toCategory(d));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const doc = await this.coll().findOne({ slug });
    return doc ? this.toCategory(doc) : null;
  }

  async maxSortOrder(parent: CategoryParentFilter): Promise<number> {
    const match = this.parentMatch(parent);
    const agg = await this.coll()
      .aggregate<{ m: number | null }>([
        { $match: match },
        { $group: { _id: null, m: { $max: '$sort_order' } } },
      ])
      .toArray();
    const max = agg[0]?.m;
    return typeof max === 'number' ? max : -1;
  }

  async create(
    payload: Pick<Category, 'name' | 'slug'> &
      Partial<Pick<Category, 'description' | 'parent_id' | 'sort_order'>>,
  ): Promise<Category> {
    const now = new Date();
    const doc: Record<string, unknown> = {
      name: payload.name,
      slug: payload.slug,
      created_at: now,
      updated_at: now,
    };
    if (payload.description !== undefined) {
      doc.description = payload.description;
    }
    if (payload.parent_id) {
      doc.parent_id = new Types.ObjectId(payload.parent_id);
    }
    if (payload.sort_order !== undefined) {
      doc.sort_order = payload.sort_order;
    }
    const res = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: res.insertedId });
    if (!inserted) {
      throw new Error('Category insert failed');
    }
    return this.toCategory(inserted);
  }

  async update(id: string, payload: Partial<Category>): Promise<Category | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const oid = new Types.ObjectId(id);
    const existing = await this.coll().findOne({ _id: oid });
    if (!existing) {
      return null;
    }
    const $set: Record<string, unknown> = { updated_at: new Date() };
    if (payload.name !== undefined) {
      $set.name = payload.name;
    }
    if (payload.slug !== undefined) {
      $set.slug = payload.slug;
    }
    if (payload.description !== undefined) {
      $set.description = payload.description;
    }
    if (payload.sort_order !== undefined) {
      $set.sort_order = payload.sort_order;
    }
    if (payload.parent_id !== undefined) {
      const pid = payload.parent_id as string | null | undefined;
      if (pid === null || pid === '') {
        $set.parent_id = null;
      } else {
        $set.parent_id = new Types.ObjectId(pid);
      }
    }
    await this.coll().updateOne({ _id: oid }, { $set });
    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.toCategory(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const r = await this.coll().deleteOne({ _id: new Types.ObjectId(id) });
    return r.deletedCount === 1;
  }

  async setSortOrders(
    orderedIds: string[],
    parent: CategoryParentFilter,
  ): Promise<void> {
    const base = this.parentMatch(parent);
    const ops = orderedIds.map((rawId, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(rawId), ...base },
        update: { $set: { sort_order: index, updated_at: new Date() } },
      },
    }));
    if (ops.length > 0) {
      await this.coll().bulkWrite(ops);
    }
  }

  async countIncomingReferences(categoryId: string): Promise<number> {
    if (!Types.ObjectId.isValid(categoryId)) {
      return 0;
    }
    const oid = new Types.ObjectId(categoryId);
    const db = this.db();
    let total = 0;
    total += await db
      .collection('doman_word_cards')
      .countDocuments({ category_id: oid });
    total += await db
      .collection('learning_units')
      .countDocuments({ category_id: oid });
    total += await db
      .collection('doman_daily_plans')
      .countDocuments({ category_id: oid });
    total += await db
      .collection('doman_sessions')
      .countDocuments({ category_id: oid });
    total += await db.collection('categories').countDocuments({ parent_id: oid });
    return total;
  }
}
