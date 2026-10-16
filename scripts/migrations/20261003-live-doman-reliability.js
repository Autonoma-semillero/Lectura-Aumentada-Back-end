/*
 * Durable delivery and expiry support for Live Doman.
 * Usage: node scripts/migrations/20261003-live-doman-reliability.js --apply
 */
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const MIGRATION_ID = '20261003-live-doman-reliability-v1';
const LOBBY_TTL_MS = Number(process.env.LIVE_DOMAN_LOBBY_TTL_MS) || 30 * 60_000;
const ACTIVE_TTL_MS = Number(process.env.LIVE_DOMAN_ACTIVE_TTL_MS) || 2 * 60 * 60_000;

function uri() {
  const value = process.env.MONGODB_URI;
  if (!value) throw new Error('MONGODB_URI is required');
  return value;
}

async function collectionOptions(db, name) {
  return (await db.listCollections({ name }, { nameOnly: false }).toArray())[0]?.options ?? {};
}

async function updateSessionValidator(db) {
  const options = await collectionOptions(db, 'doman_live_sessions');
  const validator = options.validator ?? { $jsonSchema: { bsonType: 'object', properties: {} } };
  const schema = validator.$jsonSchema;
  if (!schema) throw new Error('doman_live_sessions validator is not a JSON schema');
  schema.properties ??= {};
  schema.properties.expires_at = { bsonType: ['date', 'null'] };
  schema.properties.ended_reason = { enum: ['teacher_ended', 'teacher_cancelled', 'expired', null] };
  if (APPLY) await db.command({ collMod: 'doman_live_sessions', validator, validationLevel: 'strict', validationAction: 'error' });
}

async function updateEventValidator(db) {
  const options = await collectionOptions(db, 'doman_live_session_events');
  const validator = options.validator ?? { $jsonSchema: { bsonType: 'object', properties: {} } };
  const schema = validator.$jsonSchema;
  if (!schema) throw new Error('doman_live_session_events validator is not a JSON schema');
  schema.properties ??= {};
  schema.properties.event_type = { enum: ['lobby_opened', 'student_joined', 'student_ready', 'student_disconnected', 'session_started', 'card_presented', 'card_repeated', 'session_paused', 'session_resumed', 'session_ended', 'session_cancelled', 'session_expired'] };
  if (APPLY) await db.command({ collMod: 'doman_live_session_events', validator, validationLevel: 'strict', validationAction: 'error' });
}

async function ensureOutbox(db) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['dedupe_key', 'kind', 'session_id', 'payload', 'status', 'attempts', 'available_at', 'created_at', 'updated_at'],
      additionalProperties: false,
      properties: {
        dedupe_key: { bsonType: 'string', minLength: 1, maxLength: 200 },
        kind: { enum: ['session_created', 'session_updated', 'participants_updated'] },
        session_id: { bsonType: 'objectId' }, payload: { bsonType: 'object' },
        status: { enum: ['pending', 'processing', 'delivered'] }, attempts: { bsonType: 'int', minimum: 0 },
        available_at: { bsonType: 'date' }, claimed_at: { bsonType: ['date', 'null'] }, delivered_at: { bsonType: ['date', 'null'] },
        last_error: { bsonType: ['string', 'null'], maxLength: 500 }, created_at: { bsonType: 'date' }, updated_at: { bsonType: 'date' },
      },
    },
  };
  const exists = await db.listCollections({ name: 'doman_live_realtime_outbox' }, { nameOnly: true }).hasNext();
  if (APPLY) {
    if (!exists) await db.createCollection('doman_live_realtime_outbox', { validator, validationLevel: 'strict', validationAction: 'error' });
    else await db.command({ collMod: 'doman_live_realtime_outbox', validator, validationLevel: 'strict', validationAction: 'error' });
    await db.collection('doman_live_realtime_outbox').createIndex({ dedupe_key: 1 }, { unique: true, name: 'ux_live_realtime_outbox_dedupe' });
    await db.collection('doman_live_realtime_outbox').createIndex({ status: 1, available_at: 1, created_at: 1 }, { name: 'ix_live_realtime_outbox_dispatch' });
    await db.collection('doman_live_sessions').createIndex({ status: 1, expires_at: 1 }, { name: 'ix_live_sessions_expiry' });
  }
  return exists ? 'updated' : 'created';
}

async function main() {
  const client = new MongoClient(uri());
  await client.connect();
  try {
    const db = client.db();
    const now = new Date();
    const lobbyExpiry = new Date(now.getTime() + LOBBY_TTL_MS);
    const activeExpiry = new Date(now.getTime() + ACTIVE_TTL_MS);
    if (APPLY) {
      await updateSessionValidator(db);
      await updateEventValidator(db);
      await db.collection('doman_live_sessions').updateMany({ status: 'lobby', expires_at: { $exists: false } }, { $set: { expires_at: lobbyExpiry } });
      await db.collection('doman_live_sessions').updateMany({ status: { $in: ['running', 'paused'] }, expires_at: { $exists: false } }, { $set: { expires_at: activeExpiry } });
    }
    const outbox = await ensureOutbox(db);
    const report = { migration: MIGRATION_ID, mode: APPLY ? 'apply' : 'dry-run', outbox, database: db.databaseName };
    if (APPLY) await db.collection('schema_migrations').updateOne({ id: MIGRATION_ID }, { $set: { id: MIGRATION_ID, applied_at: now, report } }, { upsert: true });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
