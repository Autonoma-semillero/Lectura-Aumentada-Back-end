import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { Marker } from '../../domain/interfaces/marker.interface';
import {
  CreateMarkerPayload,
  IMarkersRepository,
  MarkersListFilter,
  SetMarkerModelPayload,
  UpdateMarkerPayload,
} from '../../domain/interfaces/markers.repository.interface';

@Injectable()
export class MarkersRepository implements IMarkersRepository {
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
    return this.db().collection<Document>('markers');
  }

  private learningUnits() {
    return this.db().collection<Document>('learning_units');
  }

  private toMarker(doc: Document): Marker {
    return {
      id: (doc._id as Types.ObjectId).toHexString(),
      code: doc.code as string,
      name: doc.name as string,
      description: doc.description as string | undefined,
      model_3d_url: doc.model_3d_url as string | undefined,
      model_3d_format: doc.model_3d_format as Marker['model_3d_format'],
      model_3d_updated_at: doc.model_3d_updated_at as Date | undefined,
      status: doc.status as Marker['status'],
      created_by: (doc.created_by as Types.ObjectId).toHexString(),
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findAll(filter: MarkersListFilter): Promise<Marker[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.with_model === true) {
      query.model_3d_url = { $exists: true, $ne: '' };
    }
    if (filter.with_model === false) {
      query.model_3d_url = { $exists: false };
    }
    if (filter.q) {
      query.code = { $regex: this.escapeRegex(filter.q), $options: 'i' };
    }

    let cursor = this.coll().find(query).sort({ code: 1, _id: 1 });
    if (filter.limit !== undefined) {
      cursor = cursor.limit(filter.limit);
    }
    const docs = await cursor.toArray();
    return docs.map((doc) => this.toMarker(doc));
  }

  async findById(id: string): Promise<Marker | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.coll().findOne({ _id: new Types.ObjectId(id) });
    return doc ? this.toMarker(doc) : null;
  }

  async findByCode(code: string): Promise<Marker | null> {
    const trimmed = code?.trim();
    if (!trimmed) {
      return null;
    }
    const doc = await this.coll().findOne({ code: trimmed });
    return doc ? this.toMarker(doc) : null;
  }

  async create(payload: CreateMarkerPayload): Promise<Marker> {
    const now = new Date();
    const doc: Record<string, unknown> = {
      code: payload.code,
      name: payload.name,
      status: payload.status,
      created_by: new Types.ObjectId(payload.created_by),
      created_at: now,
      updated_at: now,
    };
    if (payload.description !== undefined) {
      doc.description = payload.description;
    }
    if (payload.model_3d_url !== undefined) {
      doc.model_3d_url = payload.model_3d_url;
      doc.model_3d_format = payload.model_3d_format;
      doc.model_3d_updated_at = payload.model_3d_updated_at ?? now;
    }

    const result = await this.coll().insertOne(doc);
    const inserted = await this.coll().findOne({ _id: result.insertedId });
    if (!inserted) {
      throw new Error('Marker insert failed');
    }
    return this.toMarker(inserted);
  }

  async update(
    id: string,
    payload: UpdateMarkerPayload,
  ): Promise<Marker | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (payload.name !== undefined) {
      patch.name = payload.name;
    }
    if (payload.description !== undefined) {
      patch.description = payload.description;
    }
    if (payload.status !== undefined) {
      patch.status = payload.status;
    }

    const result = await this.coll().findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $set: patch },
      { returnDocument: 'after' },
    );
    return result ? this.toMarker(result) : null;
  }

  async setModel(
    id: string,
    payload: SetMarkerModelPayload,
  ): Promise<Marker | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const result = await this.coll().findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          model_3d_url: payload.model_3d_url,
          model_3d_format: payload.model_3d_format,
          model_3d_updated_at: payload.model_3d_updated_at,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    return result ? this.toMarker(result) : null;
  }

  async clearModel(id: string): Promise<Marker | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    // `$unset` y no `$set: null`: el validador declara `bsonType: 'string'`
    // para `model_3d_url` y rechazaría un null.
    const result = await this.coll().findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      {
        $unset: {
          model_3d_url: '',
          model_3d_format: '',
          model_3d_updated_at: '',
        },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' },
    );
    return result ? this.toMarker(result) : null;
  }

  async archive(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.coll().updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { status: 'archived', updated_at: new Date() } },
    );
    return result.matchedCount === 1;
  }

  async existsLearningUnitWithMarkerCode(code: string): Promise<boolean> {
    const trimmed = code?.trim();
    if (!trimmed) {
      return false;
    }
    const doc = await this.learningUnits().findOne(
      { marker_id: trimmed },
      { projection: { _id: 1 } },
    );
    return doc !== null;
  }
}
