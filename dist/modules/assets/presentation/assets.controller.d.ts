import { AssetsService } from '../application/assets.service';
import { CreateAssetDto } from '../dto/create-asset.dto';
export declare class AssetsController {
    private readonly service;
    constructor(service: AssetsService);
    findAll(): Promise<unknown>;
    findByMarker(markerId: string): Promise<unknown>;
    create(dto: CreateAssetDto): Promise<unknown>;
}
