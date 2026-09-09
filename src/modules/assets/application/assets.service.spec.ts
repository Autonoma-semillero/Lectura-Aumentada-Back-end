import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  function createRepository(
    result: Asset | null,
  ): jest.Mocked<IAssetsRepository> {
    return {
      findAll: jest.fn().mockResolvedValue([]),
      findByMarker: jest.fn().mockResolvedValue(result),
      findByNormalizedWord: jest.fn().mockResolvedValue([]),
      findByNormalizedWordDistance: jest.fn().mockResolvedValue([]),
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

    await expect(service.findByMarker('unknown-marker')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['ÁRBOL', '  Árbol  ', `A\u0301RBOL`, 'ＡＲＢＯＬ', '𝐀𝐑𝐁𝐎𝐋'])(
    'finds an AR asset using the normalized OCR word %p',
    async (word) => {
      const treeAsset: Asset = { ...asset, word: 'árbol' };
      const repository = createRepository(null);
      repository.findByNormalizedWord.mockResolvedValue([treeAsset]);
      const service = new AssetsService(repository);

      await expect(service.findByWord(word)).resolves.toEqual(treeAsset);
      expect(repository.findByNormalizedWord).toHaveBeenCalledWith('arbol');
    },
  );

  it('keeps ñ distinct from n during OCR word normalization', async () => {
    const childAsset: Asset = { ...asset, word: 'niño' };
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([childAsset]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('NIÑO')).resolves.toEqual(childAsset);
    expect(repository.findByNormalizedWord).toHaveBeenCalledWith('niño');
  });

  it.each(['arbol', 'árbol'])(
    'returns 409 for ambiguous usable normalized assets using %p',
    async (word) => {
      const repository = createRepository(null);
      repository.findByNormalizedWord.mockResolvedValue([
        { ...asset, word: 'árbol' },
        {
          ...asset,
          id: '507f1f77bcf86cd799439012',
          learning_unit_id: '507f1f77bcf86cd799439012',
          word: 'arbol',
        },
      ]);
      const service = new AssetsService(repository);

      await expect(service.findByWord(word)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );

  it('ignores unusable candidates when resolving normalized ambiguity', async () => {
    const repository = createRepository(null);
    const usableAsset: Asset = {
      ...asset,
      word: 'árbol',
      model_3d: `  ${asset.model_3d}  `,
    };
    const placeholderAsset: Asset = {
      ...asset,
      id: '507f1f77bcf86cd799439012',
      learning_unit_id: '507f1f77bcf86cd799439012',
      word: 'arbol',
      model_3d: 'https://demo.lectura.local/models/arbol.glb',
    };
    repository.findByNormalizedWord.mockResolvedValue([
      usableAsset,
      placeholderAsset,
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('ARBOL')).resolves.toEqual({
      ...usableAsset,
      model_3d: asset.model_3d,
    });
  });

  it('falls back to a single accent-insensitive candidate', async () => {
    const accentedAsset: Asset = { ...asset, word: 'árbol' };
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([accentedAsset]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('arbol')).resolves.toEqual(accentedAsset);
  });

  it('always prefers an exact usable asset over fuzzy candidates', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([asset]);
    repository.findByNormalizedWordDistance.mockResolvedValue([
      { ...asset, word: 'pato' },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('GATO')).resolves.toEqual(asset);
    expect(repository.findByNormalizedWordDistance).not.toHaveBeenCalled();
  });

  it('resolves a unique usable candidate at Levenshtein distance one', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWordDistance.mockResolvedValue([asset]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('PATO')).resolves.toEqual(asset);
    expect(repository.findByNormalizedWord).toHaveBeenCalledWith('pato');
    expect(repository.findByNormalizedWordDistance).toHaveBeenCalledWith(
      'pato',
      1,
    );
  });

  it('returns 409 instead of guessing between two usable distance-one assets', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWordDistance.mockResolvedValue([
      asset,
      {
        ...asset,
        id: '507f1f77bcf86cd799439012',
        learning_unit_id: '507f1f77bcf86cd799439012',
        marker_id: 'demo-animales-pato',
        word: 'pato',
      },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('RATO')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('ignores unusable and non-distance-one fuzzy candidates', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWordDistance.mockResolvedValue([
      { ...asset, model_3d: 'https://demo.lectura.local/models/gato.glb' },
      { ...asset, word: 'perro' },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('PATO')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('fuzzy-matches when every exact record has an unusable model', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([
      { ...asset, word: 'pato', model_3d: undefined },
    ]);
    repository.findByNormalizedWordDistance.mockResolvedValue([asset]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('PATO')).resolves.toEqual(asset);
    expect(repository.findByNormalizedWordDistance).toHaveBeenCalledWith(
      'pato',
      1,
    );
  });

  it('does not fuzzy-match OCR tokens shorter than three characters', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWordDistance.mockResolvedValue([
      { ...asset, word: 'yo' },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('NO')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findByNormalizedWordDistance).not.toHaveBeenCalled();
  });

  it('still resolves an exact OCR token shorter than three characters', async () => {
    const shortWordAsset: Asset = { ...asset, word: 'yo' };
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([shortWordAsset]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('YO')).resolves.toEqual(shortWordAsset);
  });

  it('does not fuzzy-match a stored token shorter than three characters', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWordDistance.mockResolvedValue([
      { ...asset, word: 'sal' },
      { ...asset, word: 'so' },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('SOL')).resolves.toMatchObject({
      word: 'sal',
    });
  });

  it('returns 404 when no candidate exactly matches the normalized word', async () => {
    const repository = createRepository(null);
    repository.findByNormalizedWord.mockResolvedValue([
      { ...asset, word: 'arbusto' },
    ]);
    const service = new AssetsService(repository);

    await expect(service.findByWord('árbol')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([undefined, '   ', 'https://demo.lectura.local/models/arbol.glb'])(
    'returns 404 when the normalized asset model is unusable: %p',
    async (model_3d) => {
      const repository = createRepository(null);
      repository.findByNormalizedWord.mockResolvedValue([
        { ...asset, word: 'árbol', model_3d },
      ]);
      const service = new AssetsService(repository);

      await expect(service.findByWord('arbol')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('rejects an empty normalized word before querying the repository', async () => {
    const repository = createRepository(null);
    const service = new AssetsService(repository);

    await expect(service.findByWord('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.findByNormalizedWord).not.toHaveBeenCalled();
  });

  it('lists only usable persisted 3D models', async () => {
    const repository = createRepository(null);
    repository.findAll.mockResolvedValue([
      asset,
      {
        ...asset,
        id: '507f1f77bcf86cd799439012',
        learning_unit_id: '507f1f77bcf86cd799439012',
        marker_id: 'demo-animales-perro',
        word: 'perro',
        model_3d: 'https://demo.lectura.local/models/animales/perro.glb',
      },
      {
        ...asset,
        id: '507f1f77bcf86cd799439013',
        learning_unit_id: '507f1f77bcf86cd799439013',
        marker_id: 'demo-animales-oso',
        word: 'oso',
        model_3d: '   ',
      },
    ]);
    const service = new AssetsService(repository);

    await expect(service.listModels()).resolves.toEqual([
      {
        learning_unit_id: asset.learning_unit_id,
        marker_id: asset.marker_id,
        word: asset.word,
        model_3d: asset.model_3d,
      },
    ]);
  });

  it('rejects assigning a marker owned by another learning unit', async () => {
    const repository = createRepository(asset);
    const service = new AssetsService(repository);

    await expect(
      service.create({
        learning_unit_id: '507f1f77bcf86cd799439099',
        marker_id: asset.marker_id,
        model_3d: asset.model_3d,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
