import { Asset } from './asset.interface';

export interface IAssetsRepository {
  findAll(): Promise<Asset[]>;
  findByMarker(markerId: string): Promise<Asset | null>;
  create(payload: Partial<Asset>): Promise<Asset>;
}
