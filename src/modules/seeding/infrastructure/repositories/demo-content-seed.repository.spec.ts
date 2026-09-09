import { Connection, Types } from 'mongoose';
import { DemoContentSeedRepository } from './demo-content-seed.repository';

describe('DemoContentSeedRepository', () => {
  it('registers the bundled cat model and audio in one learning-unit update', async () => {
    const learningUnitId = new Types.ObjectId();
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
    const findOne = jest.fn().mockResolvedValue({ _id: learningUnitId });
    const connection = Object.create(null) as Connection;
    Object.defineProperty(connection, 'db', {
      value: {
        collection: jest.fn().mockReturnValue({ updateOne, findOne }),
      },
    });
    const repository = new DemoContentSeedRepository(connection);

    await expect(
      repository.upsertLearningUnit({
        word: 'gato',
        categoryId: new Types.ObjectId().toHexString(),
        categorySlug: 'animales',
        metadataSource: 'test-seed',
      }),
    ).resolves.toBe(learningUnitId.toHexString());

    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith(
      { marker_id: 'demo-animales-gato' },
      {
        $set: expect.objectContaining({
          marker_id: 'demo-animales-gato',
          assets: {
            model_3d: 'https://appassets.androidplatform.net/assets/models/animals/animal-cat.glb',
            audio_pronunciacion:
              'https://appassets.androidplatform.net/assets/audio/animals/gato.mp3',
          },
        }),
        $setOnInsert: { created_at: expect.any(Date) },
      },
      { upsert: true },
    );
  });
});
