#!/usr/bin/env node
/**
 * Migración 20260925 — Doman individual -> sesiones en vivo.
 *
 * Esta migración es intencionalmente segura por defecto: sin --apply solo
 * inspecciona. Nunca retira ni borra el modelo legacy por accidente.
 *
 * Uso:
 *   node scripts/migrations/20260925-live-doman-sessions.js
 *   node scripts/migrations/20260925-live-doman-sessions.js --apply --fallback-owner-id=<teacher-or-admin ObjectId>
 *   node scripts/migrations/20260925-live-doman-sessions.js --apply --retire-legacy
 *   node scripts/migrations/20260925-live-doman-sessions.js --apply --purge-legacy --confirm-purge=DELETE_LEGACY_DOMAN
 *
 * `--retire-legacy` renombra las colecciones antiguas a `legacy_*`; no borra
 * datos. `--purge-legacy` solo elimina colecciones que ya fueron retiradas y
 * exige la frase de confirmación literal. Ejecutar la purga únicamente tras
 * respaldo validado y la ventana de retención aprobada por la institución.
 */

require('dotenv').config();

const { createHash } = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const MIGRATION_ID = '20260925-live-doman-sessions-v1';
const LEGACY_COLLECTIONS = [
  'doman_word_cards',
  'doman_study_plans',
  'doman_daily_plans',
  'doman_plan_assignments',
  'doman_sessions',
  'doman_session_cards',
  'doman_exposure_logs',
];
const LIVE_COLLECTIONS = [
  'doman_cards',
  'doman_repertoires',
  'doman_live_sessions',
  'doman_live_session_participants',
  'doman_live_session_events',
  'doman_live_exposures',
  'doman_student_observations',
];

function parseArgs(argv) {
  const flags = new Map();
  for (const value of argv) {
    if (!value.startsWith('--')) continue;
    const [key, rawValue] = value.slice(2).split('=', 2);
    flags.set(key, rawValue ?? true);
  }
  return {
    apply: flags.get('apply') === true,
    retireLegacy: flags.get('retire-legacy') === true,
    purgeLegacy: flags.get('purge-legacy') === true,
    confirmPurge: flags.get('confirm-purge'),
    fallbackOwnerId: flags.get('fallback-owner-id'),
  };
}

function requireUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is required');
  return uri;
}

function databaseName(client) {
  const explicit = process.env.MONGODB_DB?.trim() || process.env.MONGODB_DATABASE?.trim();
  return explicit ? client.db(explicit) : client.db();
}

function normalizeWord(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO');
}

function displayText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CO');
}

function fingerprint({ categoryId, word, language, audioUrl }) {
  return createHash('sha256')
    .update([String(categoryId), word, language ?? '', audioUrl ?? ''].join('\u0000'))
    .digest('hex');
}

function isObjectId(value) {
  return value instanceof ObjectId || (typeof value === 'string' && ObjectId.isValid(value));
}

function asObjectId(value) {
  return value instanceof ObjectId ? value : new ObjectId(value);
}

function cardValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'schema_version', 'word', 'normalized_word', 'display_text',
        'category_id', 'content_fingerprint', 'status', 'sharing_scope',
        'created_by', 'created_at', 'updated_at',
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        schema_version: { bsonType: 'int', enum: [1] },
        word: { bsonType: 'string', minLength: 1, maxLength: 120 },
        normalized_word: { bsonType: 'string', minLength: 1, maxLength: 120 },
        display_text: { bsonType: 'string', minLength: 1, maxLength: 120 },
        language: { bsonType: 'string', maxLength: 32 },
        audio_url: { bsonType: 'string', maxLength: 2048 },
        category_id: { bsonType: 'objectId' },
        learning_unit_id: { bsonType: 'objectId' },
        content_fingerprint: { bsonType: 'string', minLength: 64, maxLength: 64 },
        status: { enum: ['active', 'archived'] },
        sharing_scope: { enum: ['owner_only', 'shared'] },
        created_by: { bsonType: 'objectId' },
        legacy_source_card_ids: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'objectId' } },
        archived_at: { bsonType: ['date', 'null'] },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' },
      },
    },
  };
}

function repertoireValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'schema_version', 'name', 'normalized_name', 'stage', 'category_id',
        'card_ids', 'presentation', 'status', 'created_by', 'created_at', 'updated_at',
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        schema_version: { bsonType: 'int', enum: [1] },
        name: { bsonType: 'string', minLength: 1, maxLength: 120 },
        normalized_name: { bsonType: 'string', minLength: 1, maxLength: 120 },
        description: { bsonType: 'string', maxLength: 500 },
        stage: { enum: ['single_words', 'couplets', 'sentences', 'books'] },
        category_id: { bsonType: 'objectId' },
        card_ids: { bsonType: 'array', minItems: 1, maxItems: 10, uniqueItems: true, items: { bsonType: 'objectId' } },
        presentation: {
          bsonType: 'object', required: ['default_pacing', 'default_display_ms', 'audio_policy'], additionalProperties: false,
          properties: {
            default_pacing: { enum: ['teacher_controlled', 'timed'] },
            default_display_ms: { bsonType: 'int', minimum: 500, maximum: 10000 },
            audio_policy: { enum: ['teacher_voice', 'optional_recording', 'disabled'] },
          },
        },
        status: { enum: ['active', 'archived'] },
        created_by: { bsonType: 'objectId' },
        archived_at: { bsonType: ['date', 'null'] },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' },
      },
    },
  };
}

function liveSessionValidator() {
  const cardSnapshot = {
    bsonType: 'object',
    required: ['position', 'card_id', 'word', 'display_text'],
    additionalProperties: false,
    properties: {
      position: { bsonType: 'int', minimum: 0 }, card_id: { bsonType: 'objectId' },
      word: { bsonType: 'string', minLength: 1 }, display_text: { bsonType: 'string', minLength: 1 },
      language: { bsonType: 'string' }, audio_url: { bsonType: 'string' },
    },
  };
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'schema_version', 'teacher_id', 'group_id', 'group_snapshot', 'repertoire_id',
        'repertoire_snapshot', 'presentation', 'status', 'presentation_sequence', 'created_at', 'updated_at',
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        schema_version: { bsonType: 'int', enum: [1] }, teacher_id: { bsonType: 'objectId' }, group_id: { bsonType: 'objectId' },
        group_snapshot: {
          bsonType: 'object', required: ['name', 'student_ids'], additionalProperties: false,
          properties: { name: { bsonType: 'string', minLength: 1 }, student_ids: { bsonType: 'array', minItems: 1, maxItems: 50, uniqueItems: true, items: { bsonType: 'objectId' } } },
        },
        repertoire_id: { bsonType: 'objectId' },
        repertoire_snapshot: {
          bsonType: 'object', required: ['name', 'stage', 'category_id', 'cards'], additionalProperties: false,
          properties: { name: { bsonType: 'string', minLength: 1 }, stage: { enum: ['single_words', 'couplets', 'sentences', 'books'] }, category_id: { bsonType: 'objectId' }, cards: { bsonType: 'array', minItems: 1, maxItems: 10, items: cardSnapshot } },
        },
        presentation: {
          bsonType: 'object', required: ['pacing', 'display_ms', 'audio_policy'], additionalProperties: false,
          properties: { pacing: { enum: ['teacher_controlled', 'timed'] }, display_ms: { bsonType: 'int', minimum: 500, maximum: 10000 }, audio_policy: { enum: ['teacher_voice', 'optional_recording', 'disabled'] } },
        },
        status: { enum: ['lobby', 'running', 'paused', 'ended', 'cancelled'] },
        active_card_index: { bsonType: ['int', 'null'], minimum: 0 }, presentation_sequence: { bsonType: 'int', minimum: 0 },
        presentation_started_at: { bsonType: ['date', 'null'] }, paused_at: { bsonType: ['date', 'null'] },
        expires_at: { bsonType: ['date', 'null'] },
        group_active_key: { bsonType: 'objectId' }, started_at: { bsonType: ['date', 'null'] }, ended_at: { bsonType: ['date', 'null'] },
        ended_reason: { enum: ['teacher_ended', 'teacher_cancelled', 'expired', null] }, created_at: { bsonType: 'date' }, updated_at: { bsonType: 'date' },
      },
    },
  };
}

function participantValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['session_id', 'student_id', 'invited_at', 'connection_state', 'current_ack_sequence', 'created_at', 'updated_at'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        session_id: { bsonType: 'objectId' }, student_id: { bsonType: 'objectId' }, invited_at: { bsonType: 'date' },
        joined_at: { bsonType: ['date', 'null'] }, last_seen_at: { bsonType: ['date', 'null'] }, left_at: { bsonType: ['date', 'null'] },
        connection_state: { enum: ['invited', 'connected', 'ready', 'disconnected', 'left'] }, active_student_key: { enum: ['live', null] },
        current_ack_sequence: { bsonType: 'int', minimum: 0 }, created_at: { bsonType: 'date' }, updated_at: { bsonType: 'date' },
      },
    },
  };
}

function eventValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['session_id', 'sequence', 'event_type', 'actor_type', 'payload', 'occurred_at'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        session_id: { bsonType: 'objectId' }, sequence: { bsonType: 'int', minimum: 0 }, command_id: { bsonType: 'string', minLength: 16, maxLength: 128 },
        event_type: { enum: ['lobby_opened', 'student_joined', 'student_ready', 'student_disconnected', 'session_started', 'card_presented', 'card_repeated', 'session_paused', 'session_resumed', 'session_ended', 'session_cancelled'] },
        actor_type: { enum: ['teacher', 'student', 'system'] }, actor_id: { bsonType: 'objectId' }, payload: { bsonType: 'object' }, occurred_at: { bsonType: 'date' },
      },
    },
  };
}

function exposureValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['session_id', 'student_id', 'presentation_sequence', 'card_id', 'card_index', 'emitted_at', 'delivery_status', 'created_at', 'updated_at'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        session_id: { bsonType: 'objectId' }, student_id: { bsonType: 'objectId' }, presentation_sequence: { bsonType: 'int', minimum: 1 },
        card_id: { bsonType: 'objectId' }, card_index: { bsonType: 'int', minimum: 0 }, emitted_at: { bsonType: 'date' },
        rendered_at: { bsonType: ['date', 'null'] }, acknowledged_at: { bsonType: ['date', 'null'] }, visibility_duration_ms: { bsonType: ['int', 'null'], minimum: 0 },
        delivery_status: { enum: ['emitted', 'rendered', 'unconfirmed', 'not_delivered'] }, created_at: { bsonType: 'date' }, updated_at: { bsonType: 'date' },
      },
    },
  };
}

function observationValidator() {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['session_id', 'student_id', 'recorded_by', 'kind', 'value', 'created_at', 'updated_at'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        session_id: { bsonType: 'objectId' }, student_id: { bsonType: 'objectId' }, recorded_by: { bsonType: 'objectId' },
        kind: { enum: ['engagement', 'attention', 'observed_response', 'follow_up'] }, value: { enum: ['observed', 'not_observed', 'needs_follow_up'] },
        note: { bsonType: 'string', maxLength: 500 }, created_at: { bsonType: 'date' }, updated_at: { bsonType: 'date' },
      },
    },
  };
}

async function ensureCollection(db, name, validator, apply) {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  if (!apply) return { name, action: exists ? 'would-update-validator' : 'would-create' };
  if (!exists) {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
    return { name, action: 'created' };
  }
  await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  return { name, action: 'validator-updated' };
}

async function ensureIndexes(db, apply) {
  const indexes = [
    ['doman_cards', { created_by: 1, category_id: 1, content_fingerprint: 1 }, { unique: true, partialFilterExpression: { status: 'active' }, name: 'ux_doman_cards_owner_category_content_active' }],
    ['doman_cards', { created_by: 1, status: 1, updated_at: -1 }, { name: 'ix_doman_cards_owner_status_updated' }],
    ['doman_cards', { category_id: 1, status: 1, word: 1 }, { name: 'ix_doman_cards_category_status_word' }],
    ['doman_repertoires', { created_by: 1, normalized_name: 1 }, { unique: true, partialFilterExpression: { status: 'active' }, name: 'ux_doman_repertoires_owner_name_active' }],
    ['doman_repertoires', { created_by: 1, status: 1, updated_at: -1 }, { name: 'ix_doman_repertoires_owner_status_updated' }],
    ['doman_live_sessions', { group_active_key: 1 }, { unique: true, partialFilterExpression: { group_active_key: { $exists: true } }, name: 'ux_doman_live_sessions_one_active_group' }],
    ['doman_live_sessions', { teacher_id: 1, status: 1, created_at: -1 }, { name: 'ix_doman_live_sessions_teacher_status_created' }],
    ['doman_live_sessions', { 'group_snapshot.student_ids': 1, status: 1, updated_at: -1 }, { name: 'ix_doman_live_sessions_student_status_updated' }],
    ['doman_live_session_participants', { session_id: 1, student_id: 1 }, { unique: true, name: 'ux_live_participants_session_student' }],
    ['doman_live_session_participants', { student_id: 1, active_student_key: 1 }, { unique: true, partialFilterExpression: { active_student_key: 'live' }, name: 'ux_live_participants_one_active_student' }],
    ['doman_live_session_participants', { student_id: 1, connection_state: 1, updated_at: -1 }, { name: 'ix_live_participants_student_connection' }],
    ['doman_live_session_events', { session_id: 1, sequence: 1 }, { unique: true, name: 'ux_live_events_session_sequence' }],
    ['doman_live_session_events', { session_id: 1, command_id: 1 }, { unique: true, sparse: true, name: 'ux_live_events_session_command' }],
    ['doman_live_session_events', { occurred_at: -1 }, { name: 'ix_live_events_occurred' }],
    ['doman_live_exposures', { session_id: 1, student_id: 1, presentation_sequence: 1 }, { unique: true, name: 'ux_live_exposures_participant_presentation' }],
    ['doman_live_exposures', { student_id: 1, created_at: -1 }, { name: 'ix_live_exposures_student_created' }],
    ['doman_live_exposures', { session_id: 1, card_id: 1 }, { name: 'ix_live_exposures_session_card' }],
    ['doman_student_observations', { session_id: 1, student_id: 1, kind: 1 }, { unique: true, name: 'ux_live_observations_session_student_kind' }],
    ['doman_student_observations', { student_id: 1, created_at: -1 }, { name: 'ix_live_observations_student_created' }],
  ];
  if (!apply) return indexes.map(([collection, , options]) => `${collection}.${options.name}`);
  for (const [collection, keys, options] of indexes) await db.collection(collection).createIndex(keys, options);
  return indexes.map(([collection, , options]) => `${collection}.${options.name}`);
}

async function validOwner(db, ownerId, cache) {
  const key = ownerId.toHexString();
  if (cache.has(key)) return cache.get(key);
  const user = await db.collection('users').findOne({ _id: ownerId, roles: { $in: ['teacher', 'admin'] }, status: 'active' }, { projection: { _id: 1 } });
  const result = Boolean(user);
  cache.set(key, result);
  return result;
}

async function migrationPreview(db, fallbackOwnerId) {
  const legacy = db.collection('doman_word_cards');
  const [legacyCards, activeCards] = await Promise.all([
    legacy.countDocuments(),
    db.collection('doman_cards').countDocuments(),
  ]);
  const missingRequired = await legacy.countDocuments({ $or: [{ word: { $exists: false } }, { word: '' }, { category_id: { $exists: false } }, { category_id: null }] });
  const missingOwner = await legacy.countDocuments({ $or: [{ created_by: { $exists: false } }, { created_by: null }] });
  return { legacyCards, activeCards, missingRequired, missingOwner, fallbackOwnerId: fallbackOwnerId?.toHexString() ?? null };
}

async function migrateCards(db, fallbackOwnerId, apply) {
  const preview = await migrationPreview(db, fallbackOwnerId);
  if (!apply) return { ...preview, migrated: 0, skipped: 0, mode: 'dry-run' };
  if (preview.missingOwner > 0 && !fallbackOwnerId) {
    throw new Error(`${preview.missingOwner} legacy cards have no created_by. Supply --fallback-owner-id=<active teacher/admin ObjectId>.`);
  }
  if (fallbackOwnerId && !(await validOwner(db, fallbackOwnerId, new Map()))) {
    throw new Error('fallback-owner-id must reference an active teacher or admin');
  }

  const ownerCache = new Map();
  const cards = db.collection('doman_word_cards').find({});
  let migrated = 0;
  let skipped = 0;
  for await (const legacy of cards) {
    const word = normalizeWord(legacy.word);
    if (!word || !isObjectId(legacy.category_id)) {
      skipped += 1;
      continue;
    }
    let owner = isObjectId(legacy.created_by) ? asObjectId(legacy.created_by) : fallbackOwnerId;
    if (!owner || !(await validOwner(db, owner, ownerCache))) {
      skipped += 1;
      continue;
    }
    const categoryId = asObjectId(legacy.category_id);
    const language = typeof legacy.language === 'string' && legacy.language.trim() ? legacy.language.trim() : undefined;
    const audioUrl = typeof legacy.audio_url === 'string' && legacy.audio_url.trim() ? legacy.audio_url.trim() : undefined;
    const contentFingerprint = fingerprint({ categoryId, word, language, audioUrl });
    const now = new Date();
    const insert = {
      schema_version: 1, word, normalized_word: word, display_text: displayText(legacy.word),
      ...(language ? { language } : {}), ...(audioUrl ? { audio_url: audioUrl } : {}),
      category_id: categoryId, ...(isObjectId(legacy.learning_unit_id) ? { learning_unit_id: asObjectId(legacy.learning_unit_id) } : {}),
      content_fingerprint: contentFingerprint, status: legacy.status === 'archived' ? 'archived' : 'active',
      sharing_scope: 'owner_only', created_by: owner,
      archived_at: legacy.status === 'archived' ? (legacy.updated_at instanceof Date ? legacy.updated_at : now) : null,
      created_at: legacy.created_at instanceof Date ? legacy.created_at : now,
    };
    await db.collection('doman_cards').updateOne(
      { created_by: owner, category_id: categoryId, content_fingerprint: contentFingerprint },
      { $setOnInsert: insert, $addToSet: { legacy_source_card_ids: legacy._id }, $set: { updated_at: now } },
      { upsert: true },
    );
    migrated += 1;
  }
  return { ...preview, migrated, skipped, mode: 'applied' };
}

async function collectionExists(db, name) {
  return db.listCollections({ name }, { nameOnly: true }).hasNext();
}

async function retireLegacyCollections(db, apply) {
  const result = [];
  for (const legacyName of LEGACY_COLLECTIONS) {
    const archiveName = `legacy_${legacyName}`;
    const [sourceExists, archiveExists] = await Promise.all([collectionExists(db, legacyName), collectionExists(db, archiveName)]);
    if (!sourceExists) { result.push({ legacyName, action: archiveExists ? 'already-retired' : 'not-found' }); continue; }
    if (archiveExists) throw new Error(`Cannot retire ${legacyName}: ${archiveName} already exists`);
    if (apply) await db.collection(legacyName).rename(archiveName, { dropTarget: false });
    result.push({ legacyName, action: apply ? 'renamed' : 'would-rename' });
  }
  return result;
}

async function purgeLegacyCollections(db, options) {
  if (options.confirmPurge !== 'DELETE_LEGACY_DOMAN') {
    throw new Error('Purge requires --confirm-purge=DELETE_LEGACY_DOMAN');
  }
  const result = [];
  for (const legacyName of LEGACY_COLLECTIONS) {
    const archiveName = `legacy_${legacyName}`;
    if (!(await collectionExists(db, archiveName))) { result.push({ archiveName, action: 'not-found' }); continue; }
    if (options.apply) await db.collection(archiveName).drop();
    result.push({ archiveName, action: options.apply ? 'dropped' : 'would-drop' });
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.purgeLegacy && !options.retireLegacy) {
    throw new Error('--purge-legacy requires --retire-legacy in the same invocation');
  }
  if (options.fallbackOwnerId && !ObjectId.isValid(options.fallbackOwnerId)) {
    throw new Error('fallback-owner-id must be a valid ObjectId');
  }
  const fallbackOwnerId = options.fallbackOwnerId ? new ObjectId(options.fallbackOwnerId) : undefined;
  const client = new MongoClient(requireUri());
  await client.connect();
  try {
    const db = databaseName(client);
    const validators = [
      ['doman_cards', cardValidator()], ['doman_repertoires', repertoireValidator()],
      ['doman_live_sessions', liveSessionValidator()], ['doman_live_session_participants', participantValidator()],
      ['doman_live_session_events', eventValidator()], ['doman_live_exposures', exposureValidator()],
      ['doman_student_observations', observationValidator()],
    ];
    const collections = [];
    for (const [name, validator] of validators) collections.push(await ensureCollection(db, name, validator, options.apply));
    const indexes = await ensureIndexes(db, options.apply);
    const cards = await migrateCards(db, fallbackOwnerId, options.apply);
    const retirement = options.retireLegacy ? await retireLegacyCollections(db, options.apply) : [];
    const purge = options.purgeLegacy ? await purgeLegacyCollections(db, options) : [];
    const report = { migration: MIGRATION_ID, database: db.databaseName, mode: options.apply ? 'apply' : 'dry-run', collections, indexes, cards, retirement, purge };
    if (options.apply) {
      await db.collection('schema_migrations').updateOne(
        { id: MIGRATION_ID },
        { $set: { id: MIGRATION_ID, applied_at: new Date(), report } },
        { upsert: true },
      );
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  if (error.errInfo) console.error(JSON.stringify(error.errInfo, null, 2));
  process.exitCode = 1;
});
