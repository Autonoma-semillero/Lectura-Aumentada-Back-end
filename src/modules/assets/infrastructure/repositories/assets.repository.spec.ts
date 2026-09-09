import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { AssetsRepository } from './assets.repository';

describe('AssetsRepository OCR word lookup', () => {
  function learningUnit(word: string, markerId: string): Document {
    return {
      _id: new Types.ObjectId(),
      marker_id: markerId,
      word,
      assets: { model_3d: `https://cdn.example.test/${word}.glb` },
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
  }

  function createRepository(docs: Document[]) {
    const find = jest.fn().mockImplementation(() => ({
      async *[Symbol.asyncIterator]() {
        for (const doc of docs) {
          yield doc;
        }
      },
    }));
    const collection = { find };
    const connection = Object.create(null) as Connection;
    Object.defineProperty(connection, 'db', {
      value: {
        collection: jest.fn().mockReturnValue(collection),
      },
    });

    return { repository: new AssetsRepository(connection), find };
  }

  it('finds only exact normalized words', async () => {
    const tree = learningUnit('Árbol', 'tree');
    const { repository } = createRepository([
      tree,
      learningUnit('arbusto', 'bush'),
    ]);

    const matches = await repository.findByNormalizedWord('arbol');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ marker_id: 'tree', word: 'Árbol' });
  });

  it('finds only words at the requested Levenshtein distance', async () => {
    const { repository } = createRepository([
      learningUnit('gato', 'cat'),
      learningUnit('dato', 'fact'),
      learningUnit('pato', 'duck'),
      learningUnit('perro', 'dog'),
    ]);

    const matches = await repository.findByNormalizedWordDistance('pato', 1);

    expect(matches.map(({ word }) => word)).toEqual(['gato', 'dato']);
  });

  it('does not scan Mongo for an invalid edit distance', async () => {
    const { repository, find } = createRepository([
      learningUnit('gato', 'cat'),
    ]);

    await expect(
      repository.findByNormalizedWordDistance('pato', -1),
    ).resolves.toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
