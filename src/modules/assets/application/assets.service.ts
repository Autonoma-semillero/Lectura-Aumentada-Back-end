import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ASSETS_REPOSITORY } from '../domain/constants/assets.tokens';
import { ArModelOption } from '../domain/interfaces/ar-model-option.interface';
import { Asset } from '../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../domain/interfaces/assets.repository.interface';
import {
  MAX_ASSET_WORD_LENGTH,
  normalizeAssetWord,
} from '../domain/types/asset-word-normalization';
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

  private getUsableModelUrl(asset: Asset): string | null {
    const modelUrl = asset.model_3d?.trim();
    if (!modelUrl || modelUrl.startsWith('https://demo.lectura.local/')) {
      return null;
    }
    return modelUrl;
  }

  async listModels(): Promise<ArModelOption[]> {
    const assets = await this.assetsRepository.findAll();
    return assets
      .flatMap((asset) => {
        const modelUrl = this.getUsableModelUrl(asset);
        if (!modelUrl) {
          return [];
        }
        return [
          {
            learning_unit_id: asset.learning_unit_id,
            marker_id: asset.marker_id,
            word: asset.word,
            model_3d: modelUrl,
          },
        ];
      })
      .sort((left, right) => left.word.localeCompare(right.word, 'es'));
  }

  async findByMarker(markerId: string): Promise<Asset> {
    const asset = await this.assetsRepository.findByMarker(markerId);
    if (!asset) {
      throw new NotFoundException(`No assets found for marker ${markerId}`);
    }
    return asset;
  }

  async findByWord(word: string): Promise<Asset> {
    const normalizedWord = normalizeAssetWord(word);
    if (
      normalizedWord.length === 0 ||
      normalizedWord.length > MAX_ASSET_WORD_LENGTH
    ) {
      throw new BadRequestException('Invalid word for AR asset lookup');
    }

    const candidates =
      await this.assetsRepository.findByNormalizedWord(normalizedWord);
    const matches = candidates.flatMap((asset) => {
      const modelUrl = this.getUsableModelUrl(asset);
      if (!modelUrl || normalizeAssetWord(asset.word) !== normalizedWord) {
        return [];
      }
      return [{ ...asset, model_3d: modelUrl }];
    });

    if (matches.length === 0) {
      throw new NotFoundException(
        `No assets found for normalized word ${normalizedWord}`,
      );
    }

    if (matches.length > 1) {
      throw new ConflictException(
        `More than one AR asset is associated with normalized word ${normalizedWord}`,
      );
    }
    return matches[0];
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    if (dto.marker_id) {
      const existing = await this.assetsRepository.findByMarker(dto.marker_id);
      if (existing && existing.learning_unit_id !== dto.learning_unit_id) {
        throw new ConflictException(
          `Marker ${dto.marker_id} is already assigned to another learning unit`,
        );
      }
    }
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
