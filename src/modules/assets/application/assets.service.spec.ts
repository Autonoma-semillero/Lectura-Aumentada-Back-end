import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset } from '../domain/interfaces/asset.interface';
import { IAssetsRepository } from '../domain/interfaces/assets.repository.interface';

describe('AssetsService', () => {
  const asset: Asset = {
    id: '507f1f77bcf86cd799439011',
    learning_unit_id: '507f1f77bcf86cd799439011',
    marker_id: 'demo-animales-gato',
    word: 'gato',
    model_3d: 'https://cdn.example.test/gato.glb',
    audio_pronunciacion: 'https://cdn.example.test/gato.mp3',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  function createRepository(result: Asset | null): jest.Mocked<IAssetsRepository> {
    return {
      findAll: jest.fn(),
      findByMarker: jest.fn().mockResolvedValue(result),
      create: jest.fn(),
    };
  }

  it('returns the typed AR assets associated with a marker', async () => {
    const repository = createRepository(asset);
    const service = new AssetsService(repository);

    await expect(service.findByMarker(asset.marker_id)).resolves.toEqual(asset);
    expect(repository.findByMarker).toHaveBeenCalledTimes(1);
    expect(repository.findByMarker).toHaveBeenCalledWith(asset.marker_id);
  });

  it('throws a controlled 404 when a marker has no association', async () => {
    const repository = createRepository(null);
    const service = new AssetsService(repository);

    await expect(service.findByMarker('unknown-marker')).rejects.toBeInstanceOf(NotFoundException);
  });
});
