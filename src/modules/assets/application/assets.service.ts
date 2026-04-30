import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ASSETS_REPOSITORY } from '../domain/constants/assets.tokens';
import { Asset } from '../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../domain/interfaces/assets.repository.interface';
import { CreateAssetDto } from '../dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(ASSETS_REPOSITORY)
    private readonly assetsRepository: IAssetsRepository,
  ) {}

  async findAll(): Promise<Asset[]> {
    return this.assetsRepository.findAll();
  }

  async findByMarker(markerId: string): Promise<Asset | null> {
    return this.assetsRepository.findByMarker(markerId);
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    const created = await this.assetsRepository.create({
      learning_unit_id: dto.learning_unit_id,
      marker_id: dto.marker_id,
      model_3d: dto.model_3d,
      audio_pronunciacion: dto.audio_pronunciacion,
      language: dto.language,
      metadata_accessibility: dto.metadata_accessibility,
    });
    if (!created) {
      throw new NotFoundException('Learning unit not found');
    }
    return created;
  }
}
