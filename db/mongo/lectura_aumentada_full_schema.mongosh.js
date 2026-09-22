// =============================================================================
// Script CANÓNICO — esquema MongoDB completo: núcleo (AR / producto) + Fase 1 Doman
// =============================================================================
// Fuentes de diseño en el repo:
//   - Vista lógica actual: docs/arquitectura/DB/Db_1.png (users, sessions, categories,
//     learning_units, progress_logs)
//   - Ejemplo de unidad: docs/agentic/db-fase1-doman.md y justificación técnica (JSON)
//   - Extensión Doman: docs/agentic/db-fase1-doman.md (colecciones doman_*)
//
// Uso (desde la raíz del repositorio):
//   mongosh "mongodb://localhost:27017/lectura_aumentada_db" --file db/mongo/lectura_aumentada_full_schema.mongosh.js
//
// Notas:
//   - Los validadores son orientativos; validationLevel "moderate" permite documentos
//     previos al validador. Ajusta campos requeridos si ya hay datos en producción.
//   - `sessions` aquí = sesión de producto / AR (diagrama). `doman_sessions` = sesión Doman.
// =============================================================================

const now = new Date();

function ensureCollection(name, validator) {
  const exists = db.getCollectionNames().includes(name);
  if (!exists) {
    db.createCollection(name, { validator });
    print(`created collection: ${name}`);
  } else {
    db.runCommand({
      collMod: name,
      validator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });
    print(`updated validator: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// NÚCLEO — alineado al diagrama Db_1 + modelo descrito en documentación del repo
// ---------------------------------------------------------------------------

ensureCollection('users', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'created_at', 'updated_at'],
    additionalProperties: true,
    properties: {
      email: { bsonType: 'string', minLength: 3 },
      username: { bsonType: 'string', minLength: 3, maxLength: 30 },
      display_name: { bsonType: 'string' },
      roles: { bsonType: 'array' },
      status: { enum: ['active', 'disabled', 'pending'] },
      password_hash: { bsonType: 'string' },
      metadata: { bsonType: 'object' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('student_groups', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'name',
      'normalized_name',
      'teacher_id',
      'status',
      'created_by',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      normalized_name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      description: { bsonType: 'string', maxLength: 500 },
      teacher_id: { bsonType: 'objectId' },
      status: { enum: ['active', 'archived'] },
      created_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('student_group_memberships', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['group_id', 'student_id', 'added_by', 'created_at'],
    additionalProperties: true,
    properties: {
      group_id: { bsonType: 'objectId' },
      student_id: { bsonType: 'objectId' },
      added_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('categories', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'slug', 'created_at', 'updated_at'],
    additionalProperties: true,
    properties: {
      name: { bsonType: 'string', minLength: 1 },
      slug: { bsonType: 'string', minLength: 1 },
      description: { bsonType: 'string' },
      icon: { bsonType: 'string' },
      parent_id: { bsonType: 'objectId' },
      sort_order: { bsonType: 'int' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('learning_units', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['word', 'marker_id', 'created_at', 'updated_at'],
    additionalProperties: true,
    properties: {
      word: { bsonType: 'string', minLength: 1 },
      category_id: { bsonType: 'objectId' },
      marker_id: { bsonType: 'string', minLength: 1 },
      assets: {
        bsonType: 'object',
        properties: {
          model_3d: { bsonType: 'string' },
          audio_pronunciacion: { bsonType: 'string' },
        },
      },
      metadata_accessibility: { bsonType: 'object' },
      language: { bsonType: 'string' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('markers', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['code', 'name', 'status', 'created_by', 'created_at', 'updated_at'],
    additionalProperties: true,
    properties: {
      code: { bsonType: 'string', minLength: 1, maxLength: 128 },
      name: { bsonType: 'string', minLength: 1, maxLength: 120 },
      description: { bsonType: 'string', maxLength: 500 },
      model_3d_url: { bsonType: 'string', minLength: 1, maxLength: 2048 },
      model_3d_format: { enum: ['glb', 'gltf'] },
      model_3d_updated_at: { bsonType: 'date' },
      status: { enum: ['active', 'archived'] },
      created_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('sessions', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'user_id',
      'session_type',
      'started_at',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      user_id: { bsonType: 'objectId' },
      session_type: { enum: ['ar_experience', 'app', 'other'] },
      learning_unit_id: { bsonType: 'objectId' },
      marker_id: { bsonType: 'string' },
      started_at: { bsonType: 'date' },
      ended_at: { bsonType: 'date' },
      client_metadata: { bsonType: 'object' },
      status: { enum: ['open', 'closed', 'cancelled'] },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('progress_logs', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['user_id', 'action', 'ts', 'created_at'],
    additionalProperties: true,
    properties: {
      user_id: { bsonType: 'objectId' },
      learning_unit_id: { bsonType: 'objectId' },
      session_id: { bsonType: 'objectId' },
      action: { bsonType: 'string', minLength: 1 },
      ts: { bsonType: 'date' },
      payload: { bsonType: 'object' },
      device: { bsonType: 'string' },
      created_at: { bsonType: 'date' },
    },
  },
});

db.users.createIndex({ email: 1 }, { unique: true, name: 'ux_users_email' });
db.users.createIndex(
  { username: 1 },
  { unique: true, sparse: true, name: 'ux_users_username' },
);
db.users.createIndex({ status: 1 }, { name: 'ix_users_status' });

db.student_groups.createIndex(
  { teacher_id: 1, status: 1, normalized_name: 1 },
  { name: 'ix_student_groups_teacher_status_name' },
);
db.student_groups.createIndex(
  { teacher_id: 1, normalized_name: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'ux_student_groups_teacher_active_name',
  },
);
db.student_groups.createIndex(
  { created_by: 1, updated_at: -1 },
  { name: 'ix_student_groups_creator_updated' },
);
db.student_group_memberships.createIndex(
  { group_id: 1, student_id: 1 },
  { unique: true, name: 'ux_student_group_membership' },
);
db.student_group_memberships.createIndex(
  { student_id: 1, group_id: 1 },
  { name: 'ix_student_group_membership_student' },
);

db.categories.createIndex(
  { slug: 1 },
  { unique: true, name: 'ux_categories_slug' },
);
db.categories.createIndex({ parent_id: 1 }, { name: 'ix_categories_parent' });
db.categories.createIndex(
  { parent_id: 1, sort_order: 1 },
  { name: 'ix_categories_parent_sort' },
);

db.learning_units.createIndex(
  { marker_id: 1 },
  { name: 'ix_learning_units_marker' },
);
db.learning_units.createIndex(
  { category_id: 1 },
  { name: 'ix_learning_units_category' },
);
db.learning_units.createIndex({ word: 1 }, { name: 'ix_learning_units_word' });

db.markers.createIndex({ code: 1 }, { unique: true, name: 'ux_markers_code' });
db.markers.createIndex({ status: 1, code: 1 }, { name: 'ix_markers_status_code' });
db.markers.createIndex(
  { created_by: 1, updated_at: -1 },
  { name: 'ix_markers_creator_updated' },
);

db.sessions.createIndex(
  { user_id: 1, started_at: -1 },
  { name: 'ix_sessions_user_started' },
);
db.sessions.createIndex(
  { learning_unit_id: 1 },
  { name: 'ix_sessions_learning_unit' },
);

db.progress_logs.createIndex(
  { user_id: 1, ts: -1 },
  { name: 'ix_progress_user_ts' },
);
db.progress_logs.createIndex(
  { learning_unit_id: 1, ts: -1 },
  { name: 'ix_progress_unit_ts' },
);
db.progress_logs.createIndex(
  { session_id: 1, ts: 1 },
  { name: 'ix_progress_session_ts' },
);

// ---------------------------------------------------------------------------
// FASE 1 — Doman (palabra + audio), aditivo respecto al núcleo
// ---------------------------------------------------------------------------

ensureCollection('doman_word_cards', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'student_id',
      'word',
      'status',
      'initial_letter',
      'times_shown',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      student_id: { bsonType: 'objectId' },
      word: { bsonType: 'string', minLength: 1 },
      audio_url: { bsonType: 'string' },
      language: { bsonType: 'string' },
      status: { enum: ['new', 'active', 'completed', 'archived'] },
      category_id: { bsonType: 'objectId' },
      learning_unit_id: { bsonType: 'objectId' },
      initial_letter: { bsonType: 'string', minLength: 1, maxLength: 1 },
      times_shown: { bsonType: 'int', minimum: 0 },
      times_audio_played: { bsonType: 'int', minimum: 0 },
      last_shown_at: { bsonType: 'date' },
      completed_at: { bsonType: 'date' },
      created_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_daily_plans', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'student_id',
      'plan_date',
      'target_cards_count',
      'target_sessions_count',
      'category_id',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      student_id: { bsonType: 'objectId' },
      plan_date: { bsonType: 'date' },
      target_cards_count: { bsonType: 'int', minimum: 1, maximum: 50 },
      target_sessions_count: { bsonType: 'int', minimum: 1, maximum: 10 },
      category_id: { bsonType: 'objectId' },
      study_plan_id: { bsonType: 'objectId' },
      study_plan_level_id: { bsonType: 'objectId' },
      algorithm_version: { bsonType: 'string' },
      notes: { bsonType: 'string' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_study_plans', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'name',
      'start_date',
      'end_date',
      'sessions_per_day',
      'display_ms',
      'audio_mode',
      'mode',
      'status',
      'levels',
      'created_by',
      'created_at',
      'updated_at',
    ],
    anyOf: [
      { required: ['student_id'] },
      {
        required: [
          'schema_version',
          'group_ids',
          'direct_student_ids',
          'student_ids',
          'students',
        ],
        properties: { schema_version: { enum: [2] } },
      },
    ],
    additionalProperties: true,
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 120 },
      description: { bsonType: 'string', maxLength: 500 },
      student_id: { bsonType: 'objectId' },
      schema_version: { bsonType: 'int', minimum: 2 },
      group_ids: {
        bsonType: 'array',
        maxItems: 100,
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      direct_student_ids: {
        bsonType: 'array',
        maxItems: 50,
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      student_ids: {
        bsonType: 'array',
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      students: {
        bsonType: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          bsonType: 'object',
          required: ['student_id', 'sources'],
          additionalProperties: false,
          properties: {
            student_id: { bsonType: 'objectId' },
            sources: {
              bsonType: 'array',
              minItems: 1,
              items: {
                bsonType: 'object',
                required: ['type'],
                additionalProperties: false,
                properties: {
                  type: { enum: ['direct', 'group'] },
                  group_id: { bsonType: 'objectId' },
                },
              },
            },
          },
        },
      },
      start_date: { bsonType: 'date' },
      end_date: { bsonType: 'date' },
      sessions_per_day: { bsonType: 'int', minimum: 1, maximum: 10 },
      display_ms: { bsonType: 'int', minimum: 200, maximum: 10000 },
      audio_mode: { enum: ['auto', 'manual', 'disabled'] },
      mode: { enum: ['manual', 'auto'] },
      status: {
        enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      },
      levels: {
        bsonType: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          bsonType: 'object',
          required: [
            '_id',
            'name',
            'order_index',
            'start_date',
            'end_date',
            'categories',
          ],
          additionalProperties: true,
          properties: {
            _id: { bsonType: 'objectId' },
            name: { bsonType: 'string', minLength: 1, maxLength: 100 },
            order_index: { bsonType: 'int', minimum: 1 },
            start_date: { bsonType: 'date' },
            end_date: { bsonType: 'date' },
            categories: {
              bsonType: 'array',
              minItems: 1,
              maxItems: 20,
              items: {
                bsonType: 'object',
                required: ['category_id'],
                oneOf: [
                  { required: ['target_cards_count'] },
                  { required: ['word_card_ids'] },
                  { required: ['word_card_words'] },
                ],
                additionalProperties: false,
                properties: {
                  category_id: { bsonType: 'objectId' },
                  target_cards_count: {
                    bsonType: 'int',
                    minimum: 1,
                    maximum: 50,
                  },
                  word_card_ids: {
                    bsonType: 'array',
                    minItems: 1,
                    maxItems: 50,
                    uniqueItems: true,
                    items: { bsonType: 'objectId' },
                  },
                  word_card_words: {
                    bsonType: 'array',
                    minItems: 1,
                    maxItems: 50,
                    uniqueItems: true,
                    items: {
                      bsonType: 'string',
                      minLength: 1,
                      maxLength: 60,
                    },
                  },
                },
              },
            },
          },
        },
      },
      created_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_plan_assignments', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'group_ids',
      'direct_student_ids',
      'student_ids',
      'students',
      'plan_date',
      'force',
      'status',
      'summary',
      'results',
      'created_by',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      group_ids: {
        bsonType: 'array',
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      direct_student_ids: {
        bsonType: 'array',
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      student_ids: {
        bsonType: 'array',
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        items: { bsonType: 'objectId' },
      },
      students: {
        bsonType: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          bsonType: 'object',
          required: ['student_id', 'sources'],
          additionalProperties: false,
          properties: {
            student_id: { bsonType: 'objectId' },
            sources: {
              bsonType: 'array',
              minItems: 1,
              items: {
                bsonType: 'object',
                required: ['type'],
                additionalProperties: false,
                properties: {
                  type: { enum: ['direct', 'group'] },
                  group_id: { bsonType: 'objectId' },
                },
              },
            },
          },
        },
      },
      category_id: { bsonType: 'objectId' },
      plan_date: { bsonType: 'date' },
      target_cards_count: { bsonType: 'int', minimum: 1, maximum: 50 },
      target_sessions_count: { bsonType: 'int', minimum: 1, maximum: 10 },
      display_ms: { bsonType: 'int', minimum: 200, maximum: 10000 },
      force: { bsonType: 'bool' },
      status: {
        enum: ['processing', 'completed', 'partial', 'failed'],
      },
      summary: {
        bsonType: 'object',
        required: ['total', 'generated', 'existing', 'failed'],
        additionalProperties: false,
        properties: {
          total: { bsonType: 'int', minimum: 0 },
          generated: { bsonType: 'int', minimum: 0 },
          existing: { bsonType: 'int', minimum: 0 },
          failed: { bsonType: 'int', minimum: 0 },
        },
      },
      results: {
        bsonType: 'array',
        maxItems: 50,
        items: {
          bsonType: 'object',
          required: ['student_id', 'status', 'sources'],
          additionalProperties: false,
          properties: {
            student_id: { bsonType: 'objectId' },
            status: { enum: ['generated', 'existing', 'failed'] },
            plan_id: { bsonType: 'objectId' },
            error: { bsonType: 'string', maxLength: 500 },
            sources: {
              bsonType: 'array',
              minItems: 1,
              items: {
                bsonType: 'object',
                required: ['type'],
                additionalProperties: false,
                properties: {
                  type: { enum: ['direct', 'group'] },
                  group_id: { bsonType: 'objectId' },
                },
              },
            },
          },
        },
      },
      created_by: { bsonType: 'objectId' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_sessions', {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'student_id',
      'daily_plan_id',
      'session_index',
      'category_id',
      'display_ms',
      'audio_mode',
      'status',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      student_id: { bsonType: 'objectId' },
      daily_plan_id: { bsonType: 'objectId' },
      session_index: { bsonType: 'int', minimum: 1, maximum: 10 },
      category_id: { bsonType: 'objectId' },
      mode: { enum: ['manual', 'auto'] },
      display_ms: { bsonType: 'int', minimum: 200, maximum: 10000 },
      audio_mode: { enum: ['auto', 'manual', 'disabled'] },
      status: { enum: ['planned', 'in_progress', 'completed', 'cancelled'] },
      started_at: { bsonType: 'date' },
      completed_at: { bsonType: 'date' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_session_cards', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['session_id', 'word_card_id', 'order_index', 'created_at'],
    additionalProperties: true,
    properties: {
      session_id: { bsonType: 'objectId' },
      word_card_id: { bsonType: 'objectId' },
      order_index: { bsonType: 'int', minimum: 0 },
      displayed_at: { bsonType: 'date' },
      audio_played_at: { bsonType: 'date' },
      created_at: { bsonType: 'date' },
    },
  },
});

ensureCollection('doman_exposure_logs', {
  $jsonSchema: {
    bsonType: 'object',
    required: ['student_id', 'event_type', 'event_ts'],
    additionalProperties: true,
    properties: {
      student_id: { bsonType: 'objectId' },
      session_id: { bsonType: 'objectId' },
      word_card_id: { bsonType: 'objectId' },
      event_type: {
        enum: [
          'card_shown',
          'card_completed',
          'card_skipped',
          'audio_played',
          'session_finished',
          'session_completed',
        ],
      },
      event_ts: { bsonType: 'date' },
      display_ms: { bsonType: 'int', minimum: 0 },
      device: { bsonType: 'string' },
      ip: { bsonType: 'string' },
      metadata: { bsonType: 'object' },
    },
  },
});

db.doman_word_cards.createIndex(
  { student_id: 1, status: 1 },
  { name: 'ix_word_cards_student_status' },
);
db.doman_word_cards.createIndex(
  { student_id: 1, word: 1 },
  { unique: true, name: 'ux_word_cards_student_word' },
);
db.doman_word_cards.createIndex(
  { student_id: 1, initial_letter: 1 },
  { name: 'ix_word_cards_student_initial' },
);
db.doman_word_cards.createIndex(
  { student_id: 1, category_id: 1 },
  { name: 'ix_word_cards_student_category' },
);
db.doman_word_cards.createIndex(
  { learning_unit_id: 1 },
  { name: 'ix_word_cards_learning_unit' },
);
db.doman_word_cards.createIndex(
  { category_id: 1, created_at: 1 },
  { name: 'ix_word_cards_category_created' },
);

db.doman_daily_plans.createIndex(
  { student_id: 1, plan_date: 1, category_id: 1 },
  { unique: true, name: 'ux_daily_plan_student_date_category' },
);

db.doman_daily_plans.createIndex(
  { study_plan_id: 1, plan_date: 1 },
  { name: 'ix_daily_plan_study_plan_date' },
);

db.doman_study_plans.createIndex(
  { student_id: 1, status: 1, start_date: 1, end_date: 1 },
  { name: 'ix_study_plan_student_status_dates' },
);
db.doman_study_plans.createIndex(
  { student_ids: 1, status: 1, start_date: 1, end_date: 1 },
  { name: 'ix_study_plan_audience_status_dates' },
);

db.doman_plan_assignments.createIndex(
  { created_by: 1, created_at: -1 },
  { name: 'ix_plan_assignments_creator_created' },
);
db.doman_plan_assignments.createIndex(
  { student_ids: 1, plan_date: -1 },
  { name: 'ix_plan_assignments_student_date' },
);
db.doman_plan_assignments.createIndex(
  { status: 1, updated_at: -1 },
  { name: 'ix_plan_assignments_status_updated' },
);
db.doman_study_plans.createIndex(
  { created_by: 1, updated_at: -1 },
  { name: 'ix_study_plan_creator_updated' },
);

if (
  db.doman_daily_plans
    .getIndexes()
    .some((index) => index.name === 'ux_daily_plan_student_date')
) {
  db.doman_daily_plans.dropIndex('ux_daily_plan_student_date');
  print('dropped legacy index: ux_daily_plan_student_date');
}

db.doman_sessions.createIndex(
  { daily_plan_id: 1, session_index: 1 },
  { unique: true, name: 'ux_doman_sessions_plan_index' },
);
db.doman_sessions.createIndex(
  { student_id: 1, status: 1 },
  { name: 'ix_doman_sessions_student_status' },
);

db.doman_session_cards.createIndex(
  { session_id: 1, order_index: 1 },
  { unique: true, name: 'ux_session_cards_order' },
);
db.doman_session_cards.createIndex(
  { session_id: 1, word_card_id: 1 },
  { unique: true, name: 'ux_session_cards_word' },
);

db.doman_exposure_logs.createIndex(
  { student_id: 1, event_ts: -1 },
  { name: 'ix_exposure_student_ts' },
);
db.doman_exposure_logs.createIndex(
  { session_id: 1, event_ts: 1 },
  { name: 'ix_exposure_session_ts' },
);
db.doman_exposure_logs.createIndex(
  { word_card_id: 1, event_ts: -1 },
  { name: 'ix_exposure_word_ts' },
);

print(
  'lectura_aumentada_full_schema: 15 colecciones (8 núcleo + 7 doman) e índices aplicados.',
);
print(`reference_time=${now.toISOString()}`);
