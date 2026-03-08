import { Connection } from 'mongoose';
import { Asset } from '../../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../../domain/interfaces/assets.repository.interface';
export declare class AssetsRepository implements IAssetsRepository {
    private readonly connection;
    constructor(connection: Connection);
    findAll(): Promise<Asset[]>;
    findByMarker(_markerId: string): Promise<Asset | null>;
    create(payload: Partial<Asset>): Promise<Asset>;
}
