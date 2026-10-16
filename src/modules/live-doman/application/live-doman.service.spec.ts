import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LiveDomanService } from './live-doman.service';
import type { ILiveDomanRepository, LiveDomanCard, LiveDomanRepertoire, LiveDomanSession } from '../domain/interfaces/live-doman.repository.interface';
import type { ILiveDomanRealtime } from '../domain/interfaces/live-doman-realtime.interface';

const id = {
  teacher: '507f1f77bcf86cd799439011', student: '507f1f77bcf86cd799439012', other: '507f1f77bcf86cd799439013',
  group: '507f1f77bcf86cd799439014', category: '507f1f77bcf86cd799439015', card: '507f1f77bcf86cd799439016',
  repertoire: '507f1f77bcf86cd799439017', session: '507f1f77bcf86cd799439018',
};
const teacher = { userId: id.teacher, role: 'teacher' as const };
const student = { userId: id.student, role: 'student' as const };
const admin = { userId: id.other, role: 'admin' as const };

function liveCard(overrides: Partial<LiveDomanCard> = {}): LiveDomanCard {
  return { schema_version: 1, id: id.card, word: 'gato', normalized_word: 'gato', display_text: 'GATO', category_id: id.category, created_by: id.teacher, status: 'active', sharing_scope: 'owner_only', content_fingerprint: 'hash', created_at: new Date(), updated_at: new Date(), ...overrides };
}
function liveRepertoire(overrides: Partial<LiveDomanRepertoire> = {}): LiveDomanRepertoire {
  return { schema_version: 1, id: id.repertoire, name: 'Animales', normalized_name: 'animales', stage: 'single_words', category_id: id.category, card_ids: [id.card], created_by: id.teacher, status: 'active', presentation: { default_pacing: 'teacher_controlled', default_display_ms: 1000, audio_policy: 'teacher_voice' }, created_at: new Date(), updated_at: new Date(), ...overrides };
}
function liveSession(overrides: Partial<LiveDomanSession> = {}): LiveDomanSession {
  return { schema_version: 1, id: id.session, teacher_id: id.teacher, group_id: id.group, repertoire_id: id.repertoire, group_snapshot: { name: 'Grupo A', student_ids: [id.student] }, repertoire_snapshot: { name: 'Animales', stage: 'single_words', category_id: id.category, cards: [{ position: 0, card_id: id.card, word: 'gato', display_text: 'GATO' }] }, presentation: { pacing: 'teacher_controlled', display_ms: 1000, audio_policy: 'teacher_voice' }, status: 'lobby', active_card_index: null, presentation_sequence: 0, created_at: new Date(), updated_at: new Date(), ...overrides };
}

describe('LiveDomanService', () => {
  const repository = {
    listCards: jest.fn(), findCard: jest.fn(), createCard: jest.fn(), updateCard: jest.fn(),
    listRepertoires: jest.fn(), findRepertoire: jest.fn(), createRepertoire: jest.fn(), findCardsByIds: jest.fn(),
    createSession: jest.fn(), findSession: jest.fn(), listSessionsForStudent: jest.fn(), listParticipants: jest.fn(), joinSession: jest.fn(), touchParticipant: jest.fn(), markStaleParticipants: jest.fn(), expireStaleSessions: jest.fn(),
    findSessionCommand: jest.fn(), setParticipantActivity: jest.fn(), applySessionCommand: jest.fn(), recordExposures: jest.fn(), acknowledge: jest.fn(), createObservation: jest.fn(),
    enqueueRealtimeEvent: jest.fn(), claimRealtimeEvents: jest.fn(), markRealtimeEventDelivered: jest.fn(), retryRealtimeEvent: jest.fn(),
  } as unknown as jest.Mocked<ILiveDomanRepository>;
  const categories = { findById: jest.fn() };
  const groups = { getById: jest.fn() };
  const realtime = { issueToken: jest.fn(), issueStudentFeedToken: jest.fn(), publishSession: jest.fn(), publishParticipants: jest.fn(), publishInvitations: jest.fn() } as jest.Mocked<ILiveDomanRealtime>;
  const service = new LiveDomanService(repository, realtime, categories as never, groups as never);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findCardsByIds.mockResolvedValue([liveCard()]);
    repository.findCard.mockResolvedValue(liveCard());
    repository.findRepertoire.mockResolvedValue(liveRepertoire());
    repository.findSession.mockResolvedValue(liveSession());
    repository.listParticipants.mockResolvedValue([]);
    repository.touchParticipant.mockResolvedValue(true);
    repository.markStaleParticipants.mockResolvedValue([]);
    repository.expireStaleSessions.mockResolvedValue([]);
    repository.claimRealtimeEvents.mockResolvedValue([]);
    groups.getById.mockResolvedValue({ id: id.group, name: 'Grupo A', status: 'active', student_ids: [id.student] });
  });

  it('limits shared resources to staff and preserves the admin shared query', async () => {
    repository.listCards.mockResolvedValue([liveCard()]);
    repository.listRepertoires.mockResolvedValue([liveRepertoire()]);
    await expect(service.listCards(teacher)).resolves.toEqual([expect.objectContaining({ id: id.card })]);
    await expect(service.listRepertoires(admin)).resolves.toEqual([expect.objectContaining({ id: id.repertoire })]);
    expect(repository.listCards).toHaveBeenCalledWith(id.teacher, false);
    expect(repository.listRepertoires).toHaveBeenCalledWith(id.other, true);
    await expect(service.listCards(student)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates normalized cards and requires a category', async () => {
    repository.createCard.mockResolvedValue(liveCard());
    await service.createCard({ word: '  Gato  ', category_id: id.category }, teacher);
    expect(categories.findById).toHaveBeenCalledWith(id.category);
    expect(repository.createCard).toHaveBeenCalledWith(expect.objectContaining({ word: 'gato', display_text: 'GATO', created_by: id.teacher }));
    await expect(service.createCard({ word: ' ', category_id: id.category }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates only owned cards and turns a missing persisted card into 404', async () => {
    repository.updateCard.mockResolvedValue(liveCard({ word: 'perro' }));
    await service.updateCard(id.card, { word: ' Perro ' }, teacher);
    expect(repository.updateCard).toHaveBeenCalledWith(id.card, expect.objectContaining({ word: 'perro', display_text: 'PERRO' }));
    repository.findCard.mockResolvedValueOnce(liveCard({ created_by: id.other }));
    await expect(service.updateCard(id.card, {}, teacher)).rejects.toBeInstanceOf(ForbiddenException);
    repository.findCard.mockResolvedValueOnce(null);
    await expect(service.updateCard(id.card, {}, teacher)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates repertoires only from active accessible cards in their category', async () => {
    repository.createRepertoire.mockResolvedValue(liveRepertoire());
    await service.createRepertoire({ name: '  Animales ', category_id: id.category, stage: 'single_words', card_ids: [id.card] }, teacher);
    expect(repository.createRepertoire).toHaveBeenCalledWith(expect.objectContaining({ name: 'Animales', normalized_name: 'animales', card_ids: [id.card] }));
    repository.findCardsByIds.mockResolvedValueOnce([liveCard({ status: 'archived' })]);
    await expect(service.createRepertoire({ name: 'x', category_id: id.category, stage: 'single_words', card_ids: [id.card] }, teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('snapshots a valid group and repertoire when opening a session', async () => {
    repository.createSession.mockResolvedValue(liveSession());
    await service.createSession({ group_id: id.group, repertoire_id: id.repertoire }, teacher);
    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining({ status: 'lobby', group_snapshot: { name: 'Grupo A', student_ids: [id.student] } }));
    expect(repository.enqueueRealtimeEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'session_created', session_id: id.session }));
    groups.getById.mockResolvedValueOnce({ id: id.group, name: 'Vacío', status: 'active', student_ids: [] });
    await expect(service.createSession({ group_id: id.group, repertoire_id: id.repertoire }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('serves student projections, participant lists, current feed and joins by role', async () => {
    repository.listParticipants.mockResolvedValue([]);
    repository.listSessionsForStudent.mockResolvedValue([liveSession()]);
    repository.joinSession.mockResolvedValue({ session_id: id.session, student_id: id.student } as never);
    await expect(service.getSession(id.session, teacher)).resolves.toEqual(expect.objectContaining({ participants: [] }));
    await expect(service.getSession(id.session, student)).resolves.toEqual({ session: expect.objectContaining({ id: id.session }) });
    await expect(service.getCurrentSessions(student)).resolves.toEqual([expect.objectContaining({ id: id.session })]);
    await expect(service.getCurrentSessions(teacher)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.joinSession(id.session, student)).resolves.toEqual(expect.objectContaining({ session: expect.any(Object) }));
    await expect(service.joinSession(id.session, teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['start', liveSession(), 'running', 0, true],
    ['next', liveSession({ status: 'running', active_card_index: 0, repertoire_snapshot: { ...liveSession().repertoire_snapshot, cards: [{ position: 0, card_id: id.card, word: 'gato', display_text: 'GATO' }, { position: 1, card_id: id.card, word: 'perro', display_text: 'PERRO' }] } }), 'running', 1, true],
    ['repeat', liveSession({ status: 'running', active_card_index: 0 }), 'running', 0, true],
    ['pause', liveSession({ status: 'running', active_card_index: 0 }), 'paused', 0, false],
    ['resume', liveSession({ status: 'paused', active_card_index: 0 }), 'running', 0, false],
    ['end', liveSession({ status: 'running', active_card_index: 0 }), 'ended', 0, false],
    ['cancel', liveSession(), 'cancelled', null, false],
  ] as const)('applies %s atomically', async (action, current, status, activeCardIndex, recordsExposure) => {
    repository.findSession.mockResolvedValueOnce(current);
    repository.applySessionCommand.mockResolvedValue({ ...current, status, active_card_index: activeCardIndex, presentation_sequence: 1 } as LiveDomanSession);
    await service.command(id.session, { action, expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, teacher);
    expect(repository.applySessionCommand).toHaveBeenCalledWith(id.session, 0, expect.any(Object), expect.any(Object));
    if (recordsExposure) expect(repository.recordExposures).toHaveBeenCalled();
  });

  it('honours command idempotency and releases a start reservation on sequence conflict', async () => {
    repository.findSessionCommand.mockResolvedValueOnce(liveSession({ status: 'running' }));
    await expect(service.command(id.session, { action: 'start', expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, teacher)).resolves.toEqual(expect.objectContaining({ status: 'running' }));
    expect(repository.applySessionCommand).not.toHaveBeenCalled();
    repository.applySessionCommand.mockResolvedValueOnce(null);
    await expect(service.command(id.session, { action: 'start', expected_sequence: 0, command_id: 'b4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, teacher)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.setParticipantActivity).toHaveBeenLastCalledWith(id.session, false);
    await expect(service.command(id.session, { action: 'start', expected_sequence: 0, command_id: 'c4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, student)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acknowledges only emitted cards and records only valid teacher observations', async () => {
    repository.findSession.mockResolvedValueOnce(liveSession({ presentation_sequence: 2, status: 'running', active_card_index: 0 }));
    repository.acknowledge.mockResolvedValue(true);
    await service.acknowledge(id.session, { sequence: 2 }, student);
    expect(repository.acknowledge).toHaveBeenCalledWith(id.session, id.student, 2);
    expect(repository.enqueueRealtimeEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'participants_updated', session_id: id.session }));
    repository.findSession.mockResolvedValueOnce(liveSession({ presentation_sequence: 1 }));
    await expect(service.acknowledge(id.session, { sequence: 2 }, student)).rejects.toBeInstanceOf(BadRequestException);
    await service.observe(id.session, { student_id: id.student, kind: 'attention', value: 'observed', note: ' atento ' }, teacher);
    expect(repository.createObservation).toHaveBeenCalledWith(expect.objectContaining({ recorded_by: id.teacher, note: 'atento' }));
    await expect(service.observe(id.session, { student_id: id.other, kind: 'attention', value: 'observed' }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('issues a capability token only after authorizing the room or student feed', async () => {
    realtime.issueToken.mockResolvedValue({ capability: 'room' });
    realtime.issueStudentFeedToken.mockResolvedValue({ capability: 'feed' });
    await expect(service.getRealtimeToken(id.session, student)).resolves.toEqual({ capability: 'room' });
    await expect(service.getStudentFeedRealtimeToken(student)).resolves.toEqual({ capability: 'feed' });
    await expect(service.getStudentFeedRealtimeToken(teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(realtime.issueToken).toHaveBeenCalledWith({ sessionId: id.session, userId: id.student, audience: 'student' });
  });

  it('never projects peer identifiers to a student', async () => {
    const result = await service.getSession(id.session, student) as { session: Record<string, unknown> };
    expect(result.session).not.toHaveProperty('teacher_id');
    expect(result.session).not.toHaveProperty('group_id');
    expect(result.session).not.toHaveProperty('group_snapshot');
    expect(result.session.repertoire_snapshot).toEqual(expect.objectContaining({ cards: [expect.not.objectContaining({ card_id: expect.anything() })] }));
  });
});
