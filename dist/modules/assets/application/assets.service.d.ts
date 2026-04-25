import { Asset } from '../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../domain/interfaces/assets.repository.interface';
import { CreateAssetDto } from '../dto/create-asset.dto';
export declare class AssetsService {
    private readonly assetsRepository;
    constructor(assetsRepository: IAssetsRepository);
    findAll(): Promise<Asset[]>;
    findByMarker(markerId: string): Promise<Asset | null>;
    create(dto: CreateAssetDto): Promise<Asset>;
}
