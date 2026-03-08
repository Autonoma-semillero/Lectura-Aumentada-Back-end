import { Inject, Injectable } from '@nestjs/common';
import { ASSETS_REPOSITORY } from '../domain/constants/assets.tokens';
import { Asset } from '../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../domain/interfaces/assets.repository.interface';
import { CreateAssetDto } from '../dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(ASSETS_REPOSITORY)
    private readonly repository: IAssetsRepository,
  ) {}

  async findAll(): Promise<Asset[]> {
    return this.repository.findAll();
  }

  async findByMarker(markerId: string): Promise<Asset | null> {
    return this.repository.findByMarker(markerId);
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    return this.repository.create(dto);
  }
}
