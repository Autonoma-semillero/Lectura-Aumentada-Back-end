import { createConnection, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { LiveDomanRepository } from './live-doman.repository';
import type { LiveDomanCard, LiveDomanSession } from '../../domain/interfaces/live-doman.repository.interface';

const mongoUri = process.env.MONGODB_URI;
const describeMongo = mongoUri ? describe : describe.skip;

describeMongo('LiveDomanRepository (Mongo integration)', () => {
  let connection: Connection;
  let repository: LiveDomanRepository;
  const ids = {
    teacher: new Types.ObjectId().toHexString(), student: new Types.ObjectId().toHexString(), group: new Types.ObjectId().toHexString(),
    category: new Types.ObjectId().toHexString(), repertoire: new Types.ObjectId().toHexString(),
  };

  beforeAll(async () => {
    const base = new URL(mongoUri as string);
    base.pathname = `/lectura_aumentada_live_doman_${process.pid}_${Date.now()}`;
    connection = await createConnection(base.toString()).asPromise();
    repository = new LiveDomanRepository(connection);
  });

  beforeEach(async () => {
    await connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await connection.db?.dropDatabase();
    await connection.close();
  });

  function card(overrides: Partial<LiveDomanCard> = {}): Omit<LiveDomanCard, 'id' | 'created_at' | 'updated_at'> {
    return { schema_version: 1, word: 'gato', normalized_word: 'gato', display_text: 'GATO', category_id: ids.category, created_by: ids.teacher, status: 'active', sharing_scope: 'owner_only', content_fingerprint: new Types.ObjectId().toHexString(), ...overrides };
  }

  it('persists cards as BSON ids and honours owner/shared visibility', async () => {
    const owned = await repository.createCard(card());
    const shared = await repository.createCard(card({ word: 'perro', normalized_word: 'perro', display_text: 'PERRO', sharing_scope: 'shared' }));
    const ownerCards = await repository.listCards(ids.teacher, false);
    expect(ownerCards.map((item) => item.id)).toEqual(expect.arrayContaining([owned.id, shared.id]));
    const visitorCards = await repository.listCards(new Types.ObjectId().toHexString(), false);
    expect(visitorCards.map((item) => item.id)).toEqual([shared.id]);
    const updated = await repository.updateCard(owned.id, { word: 'gato azul', language: 'es' });
    expect(updated).toEqual(expect.objectContaining({ word: 'gato azul', language: 'es', category_id: ids.category }));
    expect(await repository.findCard('not-an-object-id')).toBeNull();
  });

  it('keeps repertory order and creates an isolated lobby with its invited participants', async () => {
    const savedCard = await repository.createCard(card());
    const repertoire = await repository.createRepertoire({
      schema_version: 1, name: 'Animales', normalized_name: 'animales', category_id: ids.category, stage: 'single_words', card_ids: [savedCard.id],
      created_by: ids.teacher, status: 'active', presentation: { default_pacing: 'teacher_controlled', default_display_ms: 1000, audio_policy: 'teacher_voice' },
    });
    const created = await repository.createSession(session(repertoire.id, savedCard.id));
    expect(created.repertoire_snapshot.cards[0]).toMatchObject({ card_id: savedCard.id, display_text: 'GATO' });
    expect(await repository.listParticipants(created.id)).toEqual([expect.objectContaining({ student_id: ids.student, connection_state: 'invited' })]);
    expect(await repository.listSessionsForStudent(ids.student)).toEqual([expect.objectContaining({ id: created.id, status: 'lobby' })]);
    expect(await repository.joinSession(created.id, ids.student)).toEqual(expect.objectContaining({ connection_state: 'ready' }));
  });

  it('uses presentation_sequence as an optimistic concurrency boundary and records events once', async () => {
    const savedCard = await repository.createCard(card());
    const repertoire = await repository.createRepertoire({ schema_version: 1, name: 'Animales', normalized_name: 'animales', category_id: ids.category, stage: 'single_words', card_ids: [savedCard.id], created_by: ids.teacher, status: 'active', presentation: { default_pacing: 'teacher_controlled', default_display_ms: 1000, audio_policy: 'teacher_voice' } });
    const created = await repository.createSession(session(repertoire.id, savedCard.id));
    const started = await repository.applySessionCommand(created.id, 0, { status: 'running', active_card_index: 0 }, event('start'));
    expect(started).toEqual(expect.objectContaining({ presentation_sequence: 1, status: 'running' }));
    await expect(repository.applySessionCommand(created.id, 0, { status: 'paused' }, event('stale'))).resolves.toBeNull();
    expect(await repository.findSessionCommand(created.id, 'command-start')).toEqual(expect.objectContaining({ id: created.id }));
  });

  it('upserts exposures, acknowledgement and observations without creating learner mastery', async () => {
    const savedCard = await repository.createCard(card());
    const repertoire = await repository.createRepertoire({ schema_version: 1, name: 'Animales', normalized_name: 'animales', category_id: ids.category, stage: 'single_words', card_ids: [savedCard.id], created_by: ids.teacher, status: 'active', presentation: { default_pacing: 'teacher_controlled', default_display_ms: 1000, audio_policy: 'teacher_voice' } });
    const created = await repository.createSession(session(repertoire.id, savedCard.id));
    const started = await repository.applySessionCommand(created.id, 0, { status: 'running', active_card_index: 0 }, event('start')) as LiveDomanSession;
    await repository.recordExposures(started);
    await repository.recordExposures(started);
    expect(await repository.acknowledge(created.id, ids.student, started.presentation_sequence)).toBe(true);
    await repository.createObservation({ session_id: created.id, student_id: ids.student, recorded_by: ids.teacher, kind: 'attention', value: 'observed' });
    const db = connection.db;
    expect(await db?.collection('doman_live_exposures').countDocuments({ session_id: new Types.ObjectId(created.id) })).toBe(1);
    expect(await db?.collection('doman_student_observations').findOne({ session_id: new Types.ObjectId(created.id) })).toMatchObject({ value: 'observed' });
  });

  function session(repertoireId: string, cardId: string): Omit<LiveDomanSession, 'id' | 'created_at' | 'updated_at'> {
    return { schema_version: 1, teacher_id: ids.teacher, group_id: ids.group, repertoire_id: repertoireId, group_snapshot: { name: 'Grupo A', student_ids: [ids.student] }, repertoire_snapshot: { name: 'Animales', stage: 'single_words', category_id: ids.category, cards: [{ position: 0, card_id: cardId, word: 'gato', display_text: 'GATO' }] }, presentation: { pacing: 'teacher_controlled', display_ms: 1000, audio_policy: 'teacher_voice' }, status: 'lobby', active_card_index: null, presentation_sequence: 0 };
  }
  function event(suffix: string) { return { command_id: `command-${suffix}`, event_type: 'session_started', actor_id: ids.teacher, actor_type: 'teacher' as const, payload: {} }; }
});
