import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { Asset } from '../../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../../domain/interfaces/assets.repository.interface';

@Injectable()
export class AssetsRepository implements IAssetsRepository {
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
    return this.db().collection<Document>('learning_units');
  }

  private docToAsset(doc: Document): Asset | null {
    const id = doc._id as Types.ObjectId | undefined;
    if (!id) {
      return null;
    }
    const markerId = doc.marker_id as string | undefined;
    const word = doc.word as string | undefined;
    if (!markerId || !word) {
      return null;
    }
    const assets = (doc.assets ?? {}) as Record<string, unknown>;
    return {
      id: id.toHexString(),
      learning_unit_id: id.toHexString(),
      marker_id: markerId,
      word,
      model_3d: assets.model_3d as string | undefined,
      audio_pronunciacion: assets.audio_pronunciacion as string | undefined,
      language: doc.language as string | undefined,
      metadata_accessibility: doc.metadata_accessibility as
        | Record<string, unknown>
        | undefined,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  async findAll(): Promise<Asset[]> {
    const docs = await this.coll().find({}).sort({ created_at: 1, word: 1 }).toArray();
    return docs
      .map((doc) => this.docToAsset(doc))
      .filter((a): a is Asset => a !== null);
  }

  async findByMarker(markerId: string): Promise<Asset | null> {
    const trimmed = markerId?.trim();
    if (!trimmed) {
      return null;
    }
    const doc = await this.coll().findOne({ marker_id: trimmed });
    return doc ? this.docToAsset(doc) : null;
  }

  async create(payload: Partial<Asset>): Promise<Asset | null> {
    const learningUnitId = payload.learning_unit_id?.trim();
    if (!learningUnitId || !Types.ObjectId.isValid(learningUnitId)) {
      return null;
    }

    const oid = new Types.ObjectId(learningUnitId);
    const now = new Date();
    const $set: Record<string, unknown> = { updated_at: now };

    if (payload.marker_id !== undefined && payload.marker_id.trim().length > 0) {
      $set.marker_id = payload.marker_id.trim();
    }
    if (payload.model_3d !== undefined) {
      $set['assets.model_3d'] = payload.model_3d;
    }
    if (payload.audio_pronunciacion !== undefined) {
      $set['assets.audio_pronunciacion'] = payload.audio_pronunciacion;
    }
    if (payload.language !== undefined) {
      $set.language = payload.language;
    }
    if (payload.metadata_accessibility !== undefined) {
      $set.metadata_accessibility = payload.metadata_accessibility;
    }

    const result = await this.coll().updateOne({ _id: oid }, { $set });
    if (result.matchedCount === 0) {
      return null;
    }

    const doc = await this.coll().findOne({ _id: oid });
    return doc ? this.docToAsset(doc) : null;
  }
}
