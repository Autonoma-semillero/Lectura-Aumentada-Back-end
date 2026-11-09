/*
 * Adds the persisted student experience mode to Live Doman sessions.
 * Usage: node scripts/migrations/20261108-live-doman-experience-mode.js --apply
 */
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const MIGRATION_ID = '20261108-live-doman-experience-mode-v1';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db();
    const sessions = db.collection('doman_live_sessions');
    const pending = await sessions.countDocuments({ experience_mode: { $exists: false } });
    if (APPLY) {
      await sessions.updateMany(
        { experience_mode: { $exists: false } },
        { $set: { experience_mode: 'standard' } },
        // Historical rooms can predate other validator fields. This controlled write only
        // introduces a valid enum value; strict validation is restored by collMod below.
        { bypassDocumentValidation: true },
      );
      const info = (await db.listCollections({ name: 'doman_live_sessions' }, { nameOnly: false }).toArray())[0];
      const validator = info?.options?.validator;
      const schema = validator?.$jsonSchema;
      if (!schema) throw new Error('doman_live_sessions validator is not a JSON schema');
      schema.required = [...new Set([...(schema.required ?? []), 'experience_mode'])];
      schema.properties ??= {};
      schema.properties.experience_mode = { enum: ['standard', 'vr'] };
      await db.command({ collMod: 'doman_live_sessions', validator, validationLevel: 'strict', validationAction: 'error' });
    }
    const report = { migration: MIGRATION_ID, mode: APPLY ? 'apply' : 'dry-run', database: db.databaseName, sessions_to_backfill: pending };
    if (APPLY) await db.collection('schema_migrations').updateOne({ id: MIGRATION_ID }, { $set: { id: MIGRATION_ID, applied_at: new Date(), report } }, { upsert: true });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
