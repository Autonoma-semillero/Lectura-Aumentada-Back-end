#!/usr/bin/env node
/**
 * reset-demo.js
 * Limpia toda la actividad de la demo y deja las word cards en estado inicial.
 *
 * Uso:
 *   npm run demo:reset
 *   node scripts/reset-demo.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? 'test';

if (!URI) {
  console.error('❌  MONGODB_URI no está definida. Verifica tu archivo .env');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('\n🔄  Iniciando reset de demo...\n');

    // 1. Borrar toda la actividad Doman
    const [cards, expo, sess, plans, prog] = await Promise.all([
      db.collection('doman_session_cards').deleteMany({}),
      db.collection('doman_exposure_logs').deleteMany({}),
      db.collection('doman_sessions').deleteMany({}),
      db.collection('doman_daily_plans').deleteMany({}),
      db.collection('progress_logs').deleteMany({}),
    ]);

    console.log('🗑  session_cards eliminadas  :', cards.deletedCount);
    console.log('🗑  exposure_logs eliminados  :', expo.deletedCount);
    console.log('🗑  sessions eliminadas       :', sess.deletedCount);
    console.log('🗑  daily_plans eliminados    :', plans.deletedCount);
    console.log('🗑  progress_logs eliminados  :', prog.deletedCount);

    // 2. Resetear word cards al estado inicial
    const now = new Date();
    const wc = await db.collection('doman_word_cards').updateMany(
      {},
      {
        $set: {
          status: 'new',
          times_shown: 0,
          times_audio_played: 0,
          updated_at: now,
        },
        $unset: {
          last_shown_at: '',
          completed_at: '',
        },
      },
    );

    console.log('\n✅  word_cards reseteadas     :', wc.modifiedCount);

    // 3. Estado final
    const collections = [
      'doman_daily_plans',
      'doman_sessions',
      'doman_session_cards',
      'doman_exposure_logs',
      'progress_logs',
      'doman_word_cards',
    ];

    console.log('\n--- Estado final ---');
    for (const col of collections) {
      const count = await db.collection(col).countDocuments();
      console.log(`  ${col.padEnd(25)}: ${count}`);
    }

    console.log('\n🎉  Base de datos lista para la demo\n');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌  Error durante el reset:', err.message);
  process.exit(1);
});
