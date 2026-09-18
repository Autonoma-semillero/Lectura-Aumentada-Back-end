/**
 * Seed completo para demo docente.
 * Actualiza las tarjetas existentes con estados realistas y crea
 * exposure logs, daily plans y sesiones para ambos estudiantes demo.
 *
 * Uso: npx ts-node -P tsconfig.json scripts/seed-docente-demo.ts
 */

import { MongoClient, ObjectId, Int32 } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI!;
// Mongoose usa 'test' cuando la URI no incluye nombre de DB
const DB_NAME = 'test';

const STUDENT_1_ID = new ObjectId('69ed246c4a18dc1ab26f4bde');
const STUDENT_2_ID = new ObjectId('69ed9dc920ab4795731d2619');

const CATEGORIES = {
  animales:   new ObjectId('69ed2fd5679e98dd647e2623'),
  familia:    new ObjectId('69ed2fd7679e98dd647e262e'),
  cocina:     new ObjectId('69ed2fd8679e98dd647e2639'),
  naturaleza: new ObjectId('69ed2fd9679e98dd647e2644'),
  juguetes:   new ObjectId('69ed2fda679e98dd647e264f'),
} as const;

type CardPlan = {
  word: string;          // minúscula, tal como está en la BD
  status: 'new' | 'active' | 'completed' | 'archived';
  timesShown: number;
  timesAudioPlayed: number;
  daysAgo?: number;
};

// ─── Student 1: aprendizaje en curso ─────────────────────────────────────────
const STUDENT_1_PLAN: Record<keyof typeof CATEGORIES, CardPlan[]> = {
  animales: [
    { word: 'gato',    status: 'completed', timesShown: 6, timesAudioPlayed: 5, daysAgo: 12 },
    { word: 'perro',   status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 9  },
    { word: 'pato',    status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 6  },
    { word: 'vaca',    status: 'active',    timesShown: 2, timesAudioPlayed: 1              },
    { word: 'caballo', status: 'active',    timesShown: 1, timesAudioPlayed: 0              },
  ],
  familia: [
    // phase2Ready = TRUE (todas completed)
    { word: 'mamá',    status: 'completed', timesShown: 7, timesAudioPlayed: 6, daysAgo: 20 },
    { word: 'papá',    status: 'completed', timesShown: 6, timesAudioPlayed: 5, daysAgo: 18 },
    { word: 'prima',   status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 15 },
    { word: 'abuelo',  status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 10 },
    { word: 'hermana', status: 'completed', timesShown: 3, timesAudioPlayed: 2, daysAgo: 5  },
  ],
  cocina: [
    { word: 'pan',   status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 8 },
    { word: 'leche', status: 'completed', timesShown: 3, timesAudioPlayed: 2, daysAgo: 4 },
    { word: 'queso', status: 'active',    timesShown: 2, timesAudioPlayed: 1             },
    { word: 'sopa',  status: 'new',       timesShown: 0, timesAudioPlayed: 0             },
    { word: 'arroz', status: 'new',       timesShown: 0, timesAudioPlayed: 0             },
  ],
  naturaleza: [
    { word: 'árbol', status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 7 },
    { word: 'flor',  status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 3 },
    { word: 'nube',  status: 'active',    timesShown: 2, timesAudioPlayed: 1             },
    { word: 'sol',   status: 'active',    timesShown: 1, timesAudioPlayed: 0             },
    { word: 'luna',  status: 'new',       timesShown: 0, timesAudioPlayed: 0             },
  ],
  juguetes: [
    { word: 'pelota',  status: 'new', timesShown: 0, timesAudioPlayed: 0 },
    { word: 'tren',    status: 'new', timesShown: 0, timesAudioPlayed: 0 },
    { word: 'carro',   status: 'new', timesShown: 0, timesAudioPlayed: 0 },
    { word: 'trompo',  status: 'new', timesShown: 0, timesAudioPlayed: 0 },
    { word: 'bloques', status: 'new', timesShown: 0, timesAudioPlayed: 0 },
  ],
};

// ─── Student 2: más avanzado ──────────────────────────────────────────────────
const STUDENT_2_PLAN: Record<keyof typeof CATEGORIES, CardPlan[]> = {
  animales: [
    // phase2Ready = TRUE (todas completed)
    { word: 'gato',    status: 'completed', timesShown: 8, timesAudioPlayed: 7, daysAgo: 30 },
    { word: 'perro',   status: 'completed', timesShown: 7, timesAudioPlayed: 6, daysAgo: 28 },
    { word: 'pato',    status: 'completed', timesShown: 6, timesAudioPlayed: 5, daysAgo: 25 },
    { word: 'vaca',    status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 22 },
    { word: 'caballo', status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 18 },
  ],
  familia: [
    // phase2Ready = TRUE
    { word: 'mamá',    status: 'completed', timesShown: 9, timesAudioPlayed: 8, daysAgo: 35 },
    { word: 'papá',    status: 'completed', timesShown: 8, timesAudioPlayed: 7, daysAgo: 33 },
    { word: 'prima',   status: 'completed', timesShown: 7, timesAudioPlayed: 6, daysAgo: 30 },
    { word: 'abuelo',  status: 'completed', timesShown: 6, timesAudioPlayed: 5, daysAgo: 27 },
    { word: 'hermana', status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 24 },
  ],
  cocina: [
    { word: 'pan',   status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 14 },
    { word: 'leche', status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 10 },
    { word: 'queso', status: 'completed', timesShown: 3, timesAudioPlayed: 2, daysAgo: 6  },
    { word: 'sopa',  status: 'active',    timesShown: 2, timesAudioPlayed: 1              },
    { word: 'arroz', status: 'active',    timesShown: 1, timesAudioPlayed: 0              },
  ],
  naturaleza: [
    { word: 'árbol', status: 'completed', timesShown: 6, timesAudioPlayed: 5, daysAgo: 20 },
    { word: 'flor',  status: 'completed', timesShown: 5, timesAudioPlayed: 4, daysAgo: 16 },
    { word: 'nube',  status: 'active',    timesShown: 2, timesAudioPlayed: 1              },
    { word: 'sol',   status: 'active',    timesShown: 1, timesAudioPlayed: 0              },
    { word: 'luna',  status: 'archived',  timesShown: 1, timesAudioPlayed: 0              },
  ],
  juguetes: [
    { word: 'pelota',  status: 'completed', timesShown: 4, timesAudioPlayed: 3, daysAgo: 5 },
    { word: 'tren',    status: 'completed', timesShown: 3, timesAudioPlayed: 2, daysAgo: 3 },
    { word: 'carro',   status: 'active',    timesShown: 2, timesAudioPlayed: 1             },
    { word: 'trompo',  status: 'archived',  timesShown: 1, timesAudioPlayed: 0             },
    { word: 'bloques', status: 'new',       timesShown: 0, timesAudioPlayed: 0             },
  ],
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function seedStudent(
  db: ReturnType<MongoClient['db']>,
  studentId: ObjectId,
  plan: Record<keyof typeof CATEGORIES, CardPlan[]>,
  label: string,
) {
  const wordCardsColl = db.collection('doman_word_cards');
  const exposureLogsColl = db.collection('doman_exposure_logs');
  const dailyPlansColl = db.collection('doman_daily_plans');
  const sessionsColl = db.collection('doman_sessions');
  const sessionCardsColl = db.collection('doman_session_cards');

  console.log(`\n[${label}] Actualizando tarjetas...`);

  const wordCardIdsByWord = new Map<string, ObjectId>();

  for (const [slug, cards] of Object.entries(plan) as [keyof typeof CATEGORIES, CardPlan[]][]) {
    for (const card of cards) {
      const completedAt = card.status === 'completed' && card.daysAgo
        ? daysAgo(card.daysAgo)
        : undefined;

      const setFields: Record<string, unknown> = {
        status: card.status,
        times_shown: new Int32(card.timesShown),
        times_audio_played: new Int32(card.timesAudioPlayed),
        updated_at: new Date(),
      };

      let updateOp: Record<string, unknown>;
      if (completedAt) {
        setFields.completed_at = completedAt;
        updateOp = { $set: setFields };
      } else {
        updateOp = { $set: setFields, $unset: { completed_at: '' } };
      }

      const result = await wordCardsColl.findOneAndUpdate(
        { student_id: studentId, word: card.word },
        updateOp,
        { returnDocument: 'after' },
      );

      if (!result) {
        console.log(`  [${label}] SKIP (no encontrada): ${card.word}`);
        continue;
      }

      wordCardIdsByWord.set(card.word, result._id as ObjectId);
      console.log(`  [${label}] OK: ${card.word} → ${card.status} (shown:${card.timesShown})`);
    }
  }

  // ── Exposure logs para tarjetas active y completed ──────────────────────────
  console.log(`\n[${label}] Limpiando exposure logs anteriores del seed...`);
  await exposureLogsColl.deleteMany({
    student_id: studentId,
    'metadata.seed_source': 'seed-docente-demo-v1',
  });

  const exposureDocs: object[] = [];
  for (const [, cards] of Object.entries(plan) as [keyof typeof CATEGORIES, CardPlan[]][]) {
    for (const card of cards) {
      if (card.timesShown === 0) continue;
      const cardId = wordCardIdsByWord.get(card.word);
      if (!cardId) continue;

      const baseTs = card.daysAgo ? daysAgo(card.daysAgo) : daysAgo(1);

      for (let i = 0; i < card.timesShown; i++) {
        exposureDocs.push({
          student_id: studentId,
          word_card_id: cardId,
          event_type: 'card_shown',
          event_ts: new Date(baseTs.getTime() + i * 86_400_000),
          display_ms: new Int32(2200),
          device: 'seed-script',
          metadata: { seed_source: 'seed-docente-demo-v1' },
        });
      }
      for (let i = 0; i < card.timesAudioPlayed; i++) {
        exposureDocs.push({
          student_id: studentId,
          word_card_id: cardId,
          event_type: 'audio_played',
          event_ts: new Date(baseTs.getTime() + i * 86_400_000 + 1500),
          display_ms: new Int32(0),
          device: 'seed-script',
          metadata: { seed_source: 'seed-docente-demo-v1' },
        });
      }
    }
  }

  if (exposureDocs.length > 0) {
    await exposureLogsColl.insertMany(exposureDocs);
    console.log(`  [${label}] ${exposureDocs.length} exposure logs insertados`);
  }

  // ── Daily plan de hoy + 3 sesiones ─────────────────────────────────────────
  const animalesCards = plan.animales.filter((c) => c.status !== 'archived');
  const animalesCardIds = animalesCards
    .map((c) => wordCardIdsByWord.get(c.word))
    .filter((id): id is ObjectId => Boolean(id));

  if (animalesCardIds.length === 0) {
    console.log(`\n[${label}] Sin tarjetas de animales disponibles para plan de hoy`);
    return;
  }

  const todayDate = todayMidnight();

  // Borrar plan de hoy anterior
  const existingPlans = await dailyPlansColl
    .find({ student_id: studentId, plan_date: todayDate })
    .toArray();
  const existingPlanIds = existingPlans.map((p) => p._id as ObjectId);
  if (existingPlanIds.length > 0) {
    const existingSessions = await sessionsColl
      .find({ daily_plan_id: { $in: existingPlanIds } })
      .toArray();
    const existingSessionIds = existingSessions.map((s) => s._id as ObjectId);
    if (existingSessionIds.length > 0) {
      await sessionCardsColl.deleteMany({ session_id: { $in: existingSessionIds } });
      await sessionsColl.deleteMany({ _id: { $in: existingSessionIds } });
    }
    await dailyPlansColl.deleteMany({ _id: { $in: existingPlanIds } });
  }

  const now = new Date();
  const planResult = await dailyPlansColl.insertOne({
    student_id: studentId,
    plan_date: todayDate,
    target_cards_count: new Int32(animalesCardIds.length),
    target_sessions_count: new Int32(3),
    category_id: CATEGORIES.animales,
    algorithm_version: 'seed-docente-demo-v1',
    notes: 'Plan de demostración para docente',
    created_at: now,
    updated_at: now,
  });

  // Sesión 1: completada | Sesión 2: en progreso | Sesión 3: planeada
  const SESSION_CONFIGS = [
    { index: 1, status: 'completed',   startedOffset: -3600_000, completedOffset: -3560_000 },
    { index: 2, status: 'in_progress', startedOffset: -600_000,  completedOffset: null      },
    { index: 3, status: 'planned',     startedOffset: null,      completedOffset: null      },
  ] as const;

  for (const cfg of SESSION_CONFIGS) {
    const sessionDoc: Record<string, unknown> = {
      student_id: studentId,
      daily_plan_id: planResult.insertedId,
      session_index: new Int32(cfg.index),
      category_id: CATEGORIES.animales,
      mode: 'auto',
      display_ms: new Int32(2200),
      audio_mode: 'manual',
      status: cfg.status,
      created_at: now,
      updated_at: now,
    };
    if (cfg.startedOffset !== null) {
      sessionDoc.started_at = new Date(now.getTime() + cfg.startedOffset);
    }
    if (cfg.completedOffset !== null) {
      sessionDoc.completed_at = new Date(now.getTime() + cfg.completedOffset);
    }

    const sessionResult = await sessionsColl.insertOne(sessionDoc);

    await sessionCardsColl.insertMany(
      animalesCardIds.map((cardId, orderIndex) => ({
        session_id: sessionResult.insertedId,
        word_card_id: cardId,
        order_index: new Int32(orderIndex),
        created_at: now,
        ...(cfg.status !== 'planned'
          ? { displayed_at: new Date(now.getTime() + (cfg.startedOffset ?? 0) + orderIndex * 2500) }
          : {}),
      })),
    );
  }

  console.log(`\n[${label}] Plan de hoy creado (animales, ${animalesCardIds.length} tarjetas, 3 sesiones)`);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Conectado a MongoDB Atlas — DB:', DB_NAME);

  const db = client.db(DB_NAME);

  await seedStudent(db, STUDENT_1_ID, STUDENT_1_PLAN, 'Demo Student 1');
  await seedStudent(db, STUDENT_2_ID, STUDENT_2_PLAN, 'Demo Student 2');

  await client.close();

  console.log('\n══════════════════════════════════════════════════');
  console.log('✓  Seed completado exitosamente');
  console.log('══════════════════════════════════════════════════');
  console.log('  Student 1 — Familia: phase2Ready=true');
  console.log('            — Animales: 3 completed + 2 active');
  console.log('            — Cocina: 2 completed + 1 active + 2 new');
  console.log('            — Naturaleza: 2 completed + 2 active + 1 new');
  console.log('            — Juguetes: todas new');
  console.log('');
  console.log('  Student 2 — Animales: phase2Ready=true (5 completed)');
  console.log('            — Familia:  phase2Ready=true (5 completed)');
  console.log('            — Cocina: 3 completed + 2 active');
  console.log('            — Naturaleza: 2 completed + 2 active + 1 archived');
  console.log('            — Juguetes: 2 completed + 1 active + 1 archived + 1 new');
}

main().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
