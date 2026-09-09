#!/usr/bin/env node

require('dotenv').config();
const { MongoClient } = require('mongodb');

const DEMO_MEDIA_BY_WORD = Object.freeze({
  gato: Object.freeze({
    markerId: 'demo-animales-gato',
    modelUrl:
      'https://appassets.androidplatform.net/assets/models/animals/animal-cat.glb',
    audioUrl:
      'https://appassets.androidplatform.net/assets/audio/animals/gato.mp3',
  }),
  perro: Object.freeze({
    markerId: 'demo-animales-perro',
    modelUrl:
      'https://appassets.androidplatform.net/assets/models/animals/animal-dog.glb',
    audioUrl:
      'https://appassets.androidplatform.net/assets/audio/animals/perro.mp3',
  }),
});

function requestedMedia() {
  const requestedWord = process.argv[2]?.trim().toLocaleLowerCase('es');
  const media = DEMO_MEDIA_BY_WORD[requestedWord];
  if (!media || process.argv.length > 3) {
    throw new Error(
      'Usage: node scripts/set-demo-animal-media.js <gato|perro>',
    );
  }
  return { requestedWord, ...media };
}

async function main() {
  const media = requestedMedia();
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const configuredDb =
      process.env.MONGODB_DB?.trim() || process.env.MONGODB_DATABASE?.trim();
    const db = configuredDb ? client.db(configuredDb) : client.db();
    const now = new Date();
    const result = await db.collection('learning_units').updateOne(
      { marker_id: media.markerId },
      {
        $set: {
          'assets.model_3d': media.modelUrl,
          'assets.audio_pronunciacion': media.audioUrl,
          updated_at: now,
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error(`Learning unit not found for marker ${media.markerId}`);
    }

    const updated = await db.collection('learning_units').findOne(
      { marker_id: media.markerId },
      {
        projection: {
          _id: 0,
          marker_id: 1,
          word: 1,
          'assets.model_3d': 1,
          'assets.audio_pronunciacion': 1,
        },
      },
    );
    if (
      updated?.assets?.model_3d !== media.modelUrl ||
      updated?.assets?.audio_pronunciacion !== media.audioUrl
    ) {
      throw new Error(
        `Failed to verify demo media for marker ${media.markerId}`,
      );
    }
    console.log(
      JSON.stringify(
        {
          requestedWord: media.requestedWord,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          learningUnit: updated,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Failed to register demo animal media: ${error.message}`);
  process.exitCode = 1;
});
