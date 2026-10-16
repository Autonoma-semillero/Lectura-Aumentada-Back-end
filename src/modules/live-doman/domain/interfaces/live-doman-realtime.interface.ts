import type { LiveDomanParticipant, LiveDomanSession, StudentLiveDomanSession } from './live-doman.repository.interface';

export type LiveDomanRealtimeAudience = 'student' | 'teacher';

export interface ILiveDomanRealtime {
  issueToken(input: {
    sessionId: string;
    userId: string;
    audience: LiveDomanRealtimeAudience;
  }): Promise<Record<string, unknown>>;
  issueStudentFeedToken(userId: string): Promise<Record<string, unknown>>;
  publishSession(session: LiveDomanSession, studentSession: StudentLiveDomanSession): Promise<void>;
  publishParticipants(sessionId: string, participants: LiveDomanParticipant[]): Promise<void>;
  publishInvitations(session: LiveDomanSession): Promise<void>;
}
