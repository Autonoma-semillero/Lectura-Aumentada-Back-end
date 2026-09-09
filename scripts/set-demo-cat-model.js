#!/usr/bin/env node

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MARKER_ID = 'demo-animales-gato';
const MODEL_URL =
  'https://appassets.androidplatform.net/assets/models/animals/animal-cat.glb';

async function main() {
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
      { marker_id: MARKER_ID },
      {
        $set: {
          'assets.model_3d': MODEL_URL,
          updated_at: now,
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error(`Learning unit not found for marker ${MARKER_ID}`);
    }

    const updated = await db.collection('learning_units').findOne(
      { marker_id: MARKER_ID },
      { projection: { _id: 0, marker_id: 1, word: 1, 'assets.model_3d': 1 } },
    );
    console.log(
      JSON.stringify(
        {
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
  console.error(`Failed to register demo cat model: ${error.message}`);
  process.exitCode = 1;
});
