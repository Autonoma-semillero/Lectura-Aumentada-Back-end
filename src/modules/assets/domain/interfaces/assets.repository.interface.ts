import { Asset } from './asset.interface';

export interface IAssetsRepository {
  findAll(): Promise<Asset[]>;
  findByMarker(markerId: string): Promise<Asset | null>;
  /** Busca candidatas mediante comparación de palabra sin mayúsculas ni tildes. */
  findByNormalizedWord(normalizedWord: string): Promise<Asset[]>;
  /** Busca candidatas cuya palabra normalizada esté a una distancia de edición exacta. */
  findByNormalizedWordDistance(
    normalizedWord: string,
    distance: number,
  ): Promise<Asset[]>;
  /** Actualiza `learning_units.assets` (y opcionalmente `marker_id`). Devuelve null si la unidad no existe. */
  create(payload: Partial<Asset>): Promise<Asset | null>;
}
