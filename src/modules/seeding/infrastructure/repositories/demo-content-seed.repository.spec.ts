import { Connection, Types } from 'mongoose';
import { DemoContentSeedRepository } from './demo-content-seed.repository';

describe('DemoContentSeedRepository', () => {
  it.each([
    {
      label: 'cat',
      word: 'gato',
      markerId: 'demo-animales-gato',
      modelUrl:
        'https://appassets.androidplatform.net/assets/models/animals/animal-cat.glb',
      audioUrl:
        'https://appassets.androidplatform.net/assets/audio/animals/gato.mp3',
    },
    {
      label: 'dog',
      word: 'perro',
      markerId: 'demo-animales-perro',
      modelUrl:
        'https://appassets.androidplatform.net/assets/models/animals/animal-dog.glb',
      audioUrl:
        'https://appassets.androidplatform.net/assets/audio/animals/perro.mp3',
    },
  ])(
    'registers the bundled $label model and audio in one learning-unit update',
    async ({ word, markerId, modelUrl, audioUrl }) => {
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
          word,
          categoryId: new Types.ObjectId().toHexString(),
          categorySlug: 'animales',
          metadataSource: 'test-seed',
        }),
      ).resolves.toBe(learningUnitId.toHexString());

      expect(updateOne).toHaveBeenCalledTimes(1);
      expect(updateOne).toHaveBeenCalledWith(
        { marker_id: markerId },
        {
          $set: expect.objectContaining({
            marker_id: markerId,
            assets: {
              model_3d: modelUrl,
              audio_pronunciacion: audioUrl,
            },
          }),
          $setOnInsert: { created_at: expect.any(Date) },
        },
        { upsert: true },
      );
    },
  );
});
