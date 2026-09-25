import { ForbiddenException } from '@nestjs/common';
import { LiveDomanService } from './live-doman.service';
import type { ILiveDomanRepository, LiveDomanSession } from '../domain/interfaces/live-doman.repository.interface';

const teacher = { userId: '507f1f77bcf86cd799439011', role: 'teacher' as const };
const session: LiveDomanSession = {
  schema_version: 1,
  id: '507f1f77bcf86cd799439012',
  teacher_id: teacher.userId,
  group_id: '507f1f77bcf86cd799439013',
  repertoire_id: '507f1f77bcf86cd799439014',
  group_snapshot: { name: 'Grupo A', student_ids: ['507f1f77bcf86cd799439015'] },
  repertoire_snapshot: {
    name: 'Animales', stage: 'single_words', category_id: '507f1f77bcf86cd799439016',
    cards: [{ position: 0, card_id: '507f1f77bcf86cd799439017', word: 'gato', display_text: 'GATO' }],
  },
  presentation: { pacing: 'teacher_controlled', display_ms: 1000, audio_policy: 'teacher_voice' },
  status: 'lobby', active_card_index: null, presentation_sequence: 0,
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'),
};

describe('LiveDomanService', () => {
  const repository = {
    findSession: jest.fn(), findSessionCommand: jest.fn(), setParticipantActivity: jest.fn(),
    applySessionCommand: jest.fn(), recordExposures: jest.fn(),
  } as unknown as jest.Mocked<ILiveDomanRepository>;
  const service = new LiveDomanService(repository, {} as never, {} as never);

  beforeEach(() => jest.resetAllMocks());

  it('starts the shared session from the teacher command and records exposure without claiming mastery', async () => {
    const started: LiveDomanSession = { ...session, status: 'running', active_card_index: 0, presentation_sequence: 1, started_at: new Date() };
    repository.findSession.mockResolvedValue(session);
    repository.findSessionCommand.mockResolvedValue(null);
    repository.applySessionCommand.mockResolvedValue(started);

    const result = await service.command(session.id, { action: 'start', expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, teacher);

    expect(repository.setParticipantActivity).toHaveBeenCalledWith(session.id, true);
    expect(repository.applySessionCommand).toHaveBeenCalledWith(
      session.id, 0, expect.objectContaining({ status: 'running', active_card_index: 0 }), expect.objectContaining({ event_type: 'session_started' }),
    );
    expect(repository.recordExposures).toHaveBeenCalledWith(started);
    expect(result.status).toBe('running');
    expect(result).not.toHaveProperty('mastery');
  });

  it('does not allow a student to control the group presentation', async () => {
    await expect(service.command(session.id, { action: 'start', expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' }, { userId: '507f1f77bcf86cd799439015', role: 'student' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
