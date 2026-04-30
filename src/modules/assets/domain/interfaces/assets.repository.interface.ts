import { Asset } from './asset.interface';

export interface IAssetsRepository {
  findAll(): Promise<Asset[]>;
  findByMarker(markerId: string): Promise<Asset | null>;
  /** Actualiza `learning_units.assets` (y opcionalmente `marker_id`). Devuelve null si la unidad no existe. */
  create(payload: Partial<Asset>): Promise<Asset | null>;
}
