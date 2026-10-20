import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { LiveDomanService } from '../application/live-doman.service';
import { LiveDomanController } from './live-doman.controller';

const teacherId = '507f1f77bcf86cd799439011';
const studentId = '507f1f77bcf86cd799439012';
const ids = { card: '507f1f77bcf86cd799439013', repertoire: '507f1f77bcf86cd799439014', session: '507f1f77bcf86cd799439015' };

describe('LiveDomanController', () => {
  const service = {
    listCards: jest.fn(), createCard: jest.fn(), updateCard: jest.fn(), listRepertoires: jest.fn(), createRepertoire: jest.fn(),
    createSession: jest.fn(), listSessions: jest.fn(), getCurrentSessions: jest.fn(), getSession: jest.fn(), joinSession: jest.fn(), getRealtimeToken: jest.fn(), getStudentFeedRealtimeToken: jest.fn(), command: jest.fn(), acknowledge: jest.fn(), observe: jest.fn(),
  };
  const controller = new LiveDomanController(service as unknown as LiveDomanService);
  const teacherRequest = request(teacherId, 'teacher');
  const studentRequest = request(studentId, 'student');

  beforeEach(() => jest.resetAllMocks());

  it('declares the exact staff and student endpoint permissions', () => {
    expect(Reflect.getMetadata(ROLES_KEY, LiveDomanController)).toEqual(['student', 'teacher', 'admin']);
    for (const method of ['listCards', 'createCard', 'updateCard', 'listRepertoires', 'createRepertoire', 'createSession', 'listSessions', 'command', 'observe'] as const) {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual(['teacher', 'admin']);
    }
    for (const method of ['current', 'studentFeedRealtimeToken', 'join', 'acknowledge'] as const) {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual(['student']);
    }
  });

  it('delegates every resource endpoint with JWT identity', async () => {
    const cardDto = { word: 'gato', category_id: ids.card };
    const repertoireDto = { name: 'Animales', category_id: ids.card, stage: 'single_words' as const, card_ids: [ids.card] };
    const sessionDto = { group_id: ids.card, repertoire_id: ids.repertoire };
    await controller.listCards(teacherRequest);
    await controller.createCard(cardDto, teacherRequest);
    await controller.updateCard(ids.card, { word: 'perro' }, teacherRequest);
    await controller.listRepertoires(teacherRequest);
    await controller.createRepertoire(repertoireDto, teacherRequest);
    await controller.createSession(sessionDto, teacherRequest);
    await controller.listSessions(teacherRequest);
    const requester = { userId: teacherId, role: 'teacher' as const };
    expect(service.listCards).toHaveBeenCalledWith(requester);
    expect(service.listSessions).toHaveBeenCalledWith(requester);
    expect(service.createCard).toHaveBeenCalledWith(cardDto, requester);
    expect(service.updateCard).toHaveBeenCalledWith(ids.card, { word: 'perro' }, requester);
    expect(service.listRepertoires).toHaveBeenCalledWith(requester);
    expect(service.createRepertoire).toHaveBeenCalledWith(repertoireDto, requester);
    expect(service.createSession).toHaveBeenCalledWith(sessionDto, requester);
  });

  it('delegates every session endpoint with its expected body and caller', async () => {
    const command = { action: 'start' as const, expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' };
    const observation = { student_id: studentId, kind: 'attention' as const, value: 'observed' as const };
    await controller.current(studentRequest);
    await controller.getSession(ids.session, teacherRequest);
    await controller.join(ids.session, studentRequest);
    await controller.realtimeToken(ids.session, studentRequest);
    await controller.studentFeedRealtimeToken(studentRequest);
    await controller.command(ids.session, command, teacherRequest);
    await controller.acknowledge(ids.session, { sequence: 1 }, studentRequest);
    await controller.observe(ids.session, observation, teacherRequest);
    expect(service.getCurrentSessions).toHaveBeenCalledWith({ userId: studentId, role: 'student' });
    expect(service.getSession).toHaveBeenCalledWith(ids.session, { userId: teacherId, role: 'teacher' });
    expect(service.joinSession).toHaveBeenCalledWith(ids.session, { userId: studentId, role: 'student' });
    expect(service.getRealtimeToken).toHaveBeenCalledWith(ids.session, { userId: studentId, role: 'student' });
    expect(service.getStudentFeedRealtimeToken).toHaveBeenCalledWith({ userId: studentId, role: 'student' });
    expect(service.command).toHaveBeenCalledWith(ids.session, command, { userId: teacherId, role: 'teacher' });
    expect(service.acknowledge).toHaveBeenCalledWith(ids.session, { sequence: 1 }, { userId: studentId, role: 'student' });
    expect(service.observe).toHaveBeenCalledWith(ids.session, observation, { userId: teacherId, role: 'teacher' });
  });
});

function request(userId: string, role: 'student' | 'teacher' | 'admin'): Request & { user: AuthRequestUser } {
  return { user: { userId, email: `${role}@example.test`, role, jti: 'jwt' } } as unknown as Request & { user: AuthRequestUser };
}
