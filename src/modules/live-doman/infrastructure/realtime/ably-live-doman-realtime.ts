import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Rest } from 'ably';
import type { ILiveDomanRealtime, LiveDomanRealtimeAudience } from '../../domain/interfaces/live-doman-realtime.interface';
import type { LiveDomanParticipant, LiveDomanSession, StudentLiveDomanSession } from '../../domain/interfaces/live-doman.repository.interface';

/** Adapter that keeps the provider key on the server and gives each client read-only capabilities. */
@Injectable()
export class AblyLiveDomanRealtime implements ILiveDomanRealtime {
  private rest?: Rest;

  private client(): Rest {
    const key = process.env.ABLY_API_KEY?.trim();
    if (!key) throw new ServiceUnavailableException('Live updates are not configured');
    this.rest ??= new Rest({ key });
    return this.rest;
  }

  async issueToken(input: { sessionId: string; userId: string; audience: LiveDomanRealtimeAudience }): Promise<Record<string, unknown>> {
    const channel = this.channel(input.sessionId, input.audience);
    return this.client().auth.createTokenRequest({
      clientId: `${input.audience}:${input.userId}`,
      capability: JSON.stringify({ [channel]: ['subscribe'] }),
      ttl: 60 * 60 * 1000,
    }) as unknown as Record<string, unknown>;
  }

  async issueStudentFeedToken(userId: string): Promise<Record<string, unknown>> {
    const channel = this.studentFeedChannel(userId);
    return this.client().auth.createTokenRequest({
      clientId: `student:${userId}`,
      capability: JSON.stringify({ [channel]: ['subscribe'] }),
      ttl: 60 * 60 * 1000,
    }) as unknown as Record<string, unknown>;
  }

  async publishSession(session: LiveDomanSession, studentSession: StudentLiveDomanSession): Promise<void> {
    const teacherPayload = JSON.stringify({ session_id: session.id, presentation_sequence: session.presentation_sequence, session });
    const studentPayload = JSON.stringify({ session_id: studentSession.id, presentation_sequence: studentSession.presentation_sequence, session: studentSession });
    await Promise.all([
      this.client().channels.get(this.channel(session.id, 'student')).publish('live.session.updated', studentPayload),
      this.client().channels.get(this.channel(session.id, 'teacher')).publish('live.session.updated', teacherPayload),
    ]);
  }

  async publishParticipants(sessionId: string, participants: LiveDomanParticipant[]): Promise<void> {
    await this.client().channels.get(this.channel(sessionId, 'teacher')).publish('live.participants.updated', JSON.stringify({
      session_id: sessionId,
      participants,
    }));
  }

  async publishInvitations(session: LiveDomanSession): Promise<void> {
    await Promise.all(session.group_snapshot.student_ids.map((studentId) =>
      this.client().channels.get(this.studentFeedChannel(studentId)).publish('live.room.opened', JSON.stringify({ session_id: session.id })),
    ));
  }

  private channel(sessionId: string, audience: LiveDomanRealtimeAudience): string {
    return `live-doman:session:${sessionId}:${audience}`;
  }
  private studentFeedChannel(studentId: string): string { return `live-doman:student:${studentId}`; }
}
