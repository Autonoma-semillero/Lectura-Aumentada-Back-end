import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { Asset } from '../../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../../domain/interfaces/assets.repository.interface';

@Injectable()
export class AssetsRepository implements IAssetsRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  async findAll(): Promise<Asset[]> {
    void this.connection;
    return [];
  }

  async findByMarker(_markerId: string): Promise<Asset | null> {
    void this.connection;
    return null;
  }

  async create(payload: Partial<Asset>): Promise<Asset> {
    void this.connection;
    return payload as Asset;
  }
}
