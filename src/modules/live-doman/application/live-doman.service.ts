import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { CategoriesService } from '../../categories/application/categories.service';
import { GroupsService } from '../../groups/application/groups.service';
import { LIVE_DOMAN_REALTIME, LIVE_DOMAN_REPOSITORY } from '../domain/constants/live-doman.tokens';
import type { ILiveDomanRealtime } from '../domain/interfaces/live-doman-realtime.interface';
import type { ILiveDomanRepository, LiveDomanCard, LiveDomanOutboxEvent, LiveDomanRepertoire, LiveDomanSession, StudentLiveDomanSession } from '../domain/interfaces/live-doman.repository.interface';
import { AcknowledgeLiveSessionDto, CreateLiveCardDto, CreateLiveObservationDto, CreateLiveSessionDto, CreateRepertoireDto, LiveSessionCommandDto, UpdateLiveCardDto } from '../dto/live-doman.dto';

type Requester = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class LiveDomanService {
  private readonly logger = new Logger(LiveDomanService.name);
  constructor(
    @Inject(LIVE_DOMAN_REPOSITORY) private readonly liveDomanRepository: ILiveDomanRepository,
    @Inject(LIVE_DOMAN_REALTIME) private readonly liveDomanRealtime: ILiveDomanRealtime,
    private readonly categoriesService: CategoriesService,
    private readonly groupsService: GroupsService,
  ) {}

  async listCards(requester: Requester): Promise<LiveDomanCard[]> {
    this.assertTeacher(requester);
    return this.liveDomanRepository.listCards(requester.userId, requester.role === 'admin');
  }

  async createCard(dto: CreateLiveCardDto, requester: Requester): Promise<LiveDomanCard> {
    this.assertTeacher(requester);
    await this.categoriesService.findById(dto.category_id);
    const word = this.normalize(dto.word);
    if (!word) throw new BadRequestException('word cannot be empty');
    const language = dto.language?.trim() || undefined;
    const audioUrl = dto.audio_url?.trim() || undefined;
    try {
      return await this.liveDomanRepository.createCard({
        schema_version: 1, word, normalized_word: word, display_text: word.toLocaleUpperCase('es-CO'),
        category_id: dto.category_id, created_by: requester.userId, status: 'active',
        sharing_scope: dto.sharing_scope ?? 'owner_only', content_fingerprint: this.fingerprint(dto.category_id, word, language, audioUrl),
        ...(language ? { language } : {}), ...(audioUrl ? { audio_url: audioUrl } : {}),
        ...(dto.learning_unit_id ? { learning_unit_id: dto.learning_unit_id } : {}),
      });
    } catch (error) { this.rethrowDuplicateCard(error); throw error; }
  }

  async updateCard(id: string, dto: UpdateLiveCardDto, requester: Requester): Promise<LiveDomanCard> {
    this.assertTeacher(requester);
    const card = await this.requireCard(id);
    this.assertCardOwner(card, requester);
    if (dto.category_id) await this.categoriesService.findById(dto.category_id);
    const word = dto.word === undefined ? card.word : this.normalize(dto.word);
    if (!word) throw new BadRequestException('word cannot be empty');
    const categoryId = dto.category_id ?? card.category_id;
    const language = dto.language === undefined ? card.language : dto.language.trim() || undefined;
    const audioUrl = dto.audio_url === undefined ? card.audio_url : dto.audio_url.trim() || undefined;
    const updated = await this.liveDomanRepository.updateCard(id, {
      ...(dto.word !== undefined ? { word, normalized_word: word, display_text: word.toLocaleUpperCase('es-CO') } : {}),
      ...(dto.category_id ? { category_id: categoryId } : {}), ...(dto.language !== undefined ? { language } : {}),
      ...(dto.audio_url !== undefined ? { audio_url: audioUrl } : {}), ...(dto.sharing_scope ? { sharing_scope: dto.sharing_scope } : {}),
      ...(dto.status ? { status: dto.status } : {}), content_fingerprint: this.fingerprint(categoryId, word, language, audioUrl),
    });
    if (!updated) throw new NotFoundException('Live Doman card not found');
    return updated;
  }

  async listRepertoires(requester: Requester): Promise<LiveDomanRepertoire[]> {
    this.assertTeacher(requester);
    return this.liveDomanRepository.listRepertoires(requester.userId, requester.role === 'admin');
  }

  async createRepertoire(dto: CreateRepertoireDto, requester: Requester): Promise<LiveDomanRepertoire> {
    this.assertTeacher(requester);
    await this.categoriesService.findById(dto.category_id);
    const name = dto.name.trim().replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('name cannot be empty');
    await this.assertRepertoireCards(dto.card_ids, dto.category_id, requester);
    try {
      return await this.liveDomanRepository.createRepertoire({
        schema_version: 1, name, normalized_name: this.normalize(name), category_id: dto.category_id,
        stage: dto.stage, card_ids: dto.card_ids, created_by: requester.userId, status: 'active',
        ...(dto.description?.trim() ? { description: dto.description.trim() } : {}),
        presentation: { default_pacing: dto.default_pacing ?? 'teacher_controlled', default_display_ms: dto.default_display_ms ?? 1000, audio_policy: dto.audio_policy ?? 'teacher_voice' },
      });
    } catch (error) { this.rethrowDuplicateRepertoire(error); throw error; }
  }

  async createSession(dto: CreateLiveSessionDto, requester: Requester): Promise<LiveDomanSession> {
    this.assertTeacher(requester);
    await this.recoverExpiredSessions();
    const group = await this.groupsService.getById(dto.group_id, {
      userId: requester.userId,
      role: requester.role as 'teacher' | 'admin',
    });
    if (group.status !== 'active' || group.student_ids.length === 0) throw new BadRequestException('A live session requires an active group with at least one student');
    if (group.student_ids.length > 50) throw new BadRequestException('A live session supports at most 50 students');
    const repertoire = await this.requireRepertoire(dto.repertoire_id);
    this.assertRepertoireOwner(repertoire, requester);
    if (repertoire.status !== 'active') throw new BadRequestException('The repertoire is archived');
    const cards = await this.assertRepertoireCards(repertoire.card_ids, repertoire.category_id, requester);
    const ordered = new Map(cards.map((card) => [card.id, card]));
    const now = new Date();
    const presentation = {
      pacing: dto.pacing ?? repertoire.presentation.default_pacing,
      // Repertoires created before the protected pacing rule can still exist.
      display_ms: Math.max(1000, dto.display_ms ?? repertoire.presentation.default_display_ms),
      audio_policy: repertoire.presentation.audio_policy,
    };
    try {
      const created = await this.liveDomanRepository.createSession({
        schema_version: 1, teacher_id: requester.userId, group_id: group.id, repertoire_id: repertoire.id,
        group_snapshot: { name: group.name, student_ids: group.student_ids },
        repertoire_snapshot: { name: repertoire.name, stage: repertoire.stage, category_id: repertoire.category_id, cards: repertoire.card_ids.map((cardId, position) => { const card = ordered.get(cardId); if (!card) throw new BadRequestException('A repertoire card is missing'); return { position, card_id: card.id, word: card.word, display_text: card.display_text, ...(card.language ? { language: card.language } : {}), ...(card.audio_url ? { audio_url: card.audio_url } : {}) }; }) },
        presentation, status: 'lobby', active_card_index: null, presentation_sequence: 0, expires_at: this.lobbyExpiresAt(now),
      });
      await this.enqueueRealtime({ kind: 'session_created', session_id: created.id, payload: {}, dedupe_key: `invitation:${created.id}` });
      await this.flushRealtimeOutbox();
      return created;
    } catch (error) { if (error instanceof MongoServerError && error.code === 11000) throw new ConflictException('This group already has a live session'); throw error; }
  }

  async getSession(id: string, requester: Requester): Promise<unknown> {
    await this.recoverExpiredSessions();
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    return requester.role === 'student' ? { session: this.studentProjection(session) } : { session, participants: await this.liveDomanRepository.listParticipants(id) };
  }

  async getCurrentSessions(requester: Requester): Promise<StudentLiveDomanSession[]> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students have a current live-session feed');
    await this.recoverExpiredSessions();
    return (await this.liveDomanRepository.listSessionsForStudent(requester.userId)).map((session) => this.studentProjection(session));
  }

  async joinSession(id: string, requester: Requester): Promise<unknown> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students can join a live session');
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    const participant = await this.liveDomanRepository.joinSession(id, requester.userId);
    if (!participant) throw new NotFoundException('Student is not invited to this live session');
    await this.enqueueParticipants(id);
    await this.flushRealtimeOutbox();
    return { session: this.studentProjection(session), participant };
  }

  async getRealtimeToken(id: string, requester: Requester): Promise<Record<string, unknown>> {
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    const audience = requester.role === 'student' ? 'student' : 'teacher';
    if (requester.role === 'student') await this.liveDomanRepository.touchParticipant(id, requester.userId);
    return this.liveDomanRealtime.issueToken({ sessionId: id, userId: requester.userId, audience });
  }

  async heartbeat(id: string, requester: Requester): Promise<void> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students can update live-session presence');
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    if (!await this.liveDomanRepository.touchParticipant(id, requester.userId)) throw new NotFoundException('Student is not invited to this live session');
    await this.enqueueParticipants(id);
    await this.flushRealtimeOutbox();
  }

  async getStudentFeedRealtimeToken(requester: Requester): Promise<Record<string, unknown>> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students have a live-session feed');
    return this.liveDomanRealtime.issueStudentFeedToken(requester.userId);
  }

  async command(id: string, dto: LiveSessionCommandDto, requester: Requester): Promise<LiveDomanSession> {
    this.assertTeacher(requester);
    await this.recoverExpiredSessions();
    const session = await this.requireSession(id);
    if (requester.role === 'teacher' && session.teacher_id !== requester.userId) throw new ForbiddenException('Only the session teacher can control this session');
    const duplicate = await this.liveDomanRepository.findSessionCommand(id, dto.command_id);
    if (duplicate) return duplicate;
    const now = new Date();
    const mutation = this.commandMutation(session, dto.action, now);
    const claimsStudents = dto.action === 'start';
    if (claimsStudents) {
      try { await this.liveDomanRepository.setParticipantActivity(id, true); }
      catch (error) {
        await this.liveDomanRepository.setParticipantActivity(id, false);
        if (error instanceof MongoServerError && error.code === 11000) throw new ConflictException('At least one student is already in another live session');
        throw error;
      }
    }
    const updated = await this.liveDomanRepository.applySessionCommand(id, dto.expected_sequence, mutation.patch, { command_id: dto.command_id, event_type: mutation.eventType, actor_id: requester.userId, actor_type: 'teacher', payload: mutation.payload });
    if (!updated) { if (claimsStudents) await this.liveDomanRepository.setParticipantActivity(id, false); throw new ConflictException('The live session changed. Refresh its state before sending another command.'); }
    if (dto.action === 'end' || dto.action === 'cancel') await this.liveDomanRepository.setParticipantActivity(id, false);
    if (mutation.recordsExposure) await this.liveDomanRepository.recordExposures(updated);
    await this.enqueueSessionUpdate(updated);
    await this.enqueueParticipants(id);
    await this.flushRealtimeOutbox();
    return updated;
  }

  async acknowledge(id: string, dto: AcknowledgeLiveSessionDto, requester: Requester): Promise<void> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students can acknowledge a live presentation');
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    if (dto.sequence > session.presentation_sequence) throw new BadRequestException('Cannot acknowledge a future presentation');
    const acknowledged = await this.liveDomanRepository.acknowledge(id, requester.userId, dto.sequence);
    if (!acknowledged) throw new NotFoundException('Student is not invited to this live session');
    await this.enqueueParticipants(id);
    await this.flushRealtimeOutbox();
  }

  async observe(id: string, dto: CreateLiveObservationDto, requester: Requester): Promise<void> {
    this.assertTeacher(requester);
    const session = await this.requireSession(id);
    if (requester.role === 'teacher' && session.teacher_id !== requester.userId) throw new ForbiddenException('Only the session teacher can record observations');
    if (!session.group_snapshot.student_ids.includes(dto.student_id)) throw new BadRequestException('The student is not part of this live session');
    await this.liveDomanRepository.createObservation({ session_id: id, student_id: dto.student_id, recorded_by: requester.userId, kind: dto.kind, value: dto.value, note: dto.note?.trim() || undefined });
  }

  async runMaintenance(): Promise<{ expired_session_ids: string[]; dispatched_events: number }> {
    const expired = await this.recoverExpiredSessions(false);
    const changedParticipantSessions = await this.liveDomanRepository.markStaleParticipants(new Date(), new Date(Date.now() - this.durationFromEnv('LIVE_DOMAN_PRESENCE_TTL_MS', 90_000))) ?? [];
    for (const sessionId of changedParticipantSessions) await this.enqueueParticipants(sessionId);
    const dispatched = await this.flushRealtimeOutbox();
    return { expired_session_ids: expired.map((session) => session.id), dispatched_events: dispatched };
  }

  private commandMutation(session: LiveDomanSession, action: LiveSessionCommandDto['action'], now: Date): { patch: Partial<LiveDomanSession>; eventType: string; payload: Record<string, unknown>; recordsExposure: boolean } {
    const activeExpiry = this.activeExpiresAt(now);
    if (action === 'start') { if (session.status !== 'lobby') throw new BadRequestException('Only a lobby can start'); return { patch: { status: 'running', active_card_index: 0, presentation_started_at: now, started_at: now, expires_at: activeExpiry }, eventType: 'session_started', payload: { card_index: 0 }, recordsExposure: true }; }
    if (action === 'next') { if (session.status !== 'running' || session.active_card_index === null) throw new BadRequestException('Only a running session can advance'); const next = session.active_card_index + 1; if (next >= session.repertoire_snapshot.cards.length) throw new BadRequestException('This is the last card. End the session when the group is ready.'); return { patch: { active_card_index: next, presentation_started_at: now, expires_at: activeExpiry }, eventType: 'card_presented', payload: { card_index: next }, recordsExposure: true }; }
    if (action === 'repeat') { if (session.status !== 'running' || session.active_card_index === null) throw new BadRequestException('Only a visible card can be repeated'); return { patch: { presentation_started_at: now, expires_at: activeExpiry }, eventType: 'card_repeated', payload: { card_index: session.active_card_index }, recordsExposure: true }; }
    if (action === 'pause') { if (session.status !== 'running') throw new BadRequestException('Only a running session can pause'); return { patch: { status: 'paused', paused_at: now, expires_at: activeExpiry }, eventType: 'session_paused', payload: {}, recordsExposure: false }; }
    if (action === 'resume') { if (session.status !== 'paused') throw new BadRequestException('Only a paused session can resume'); return { patch: { status: 'running', paused_at: undefined, expires_at: activeExpiry }, eventType: 'session_resumed', payload: {}, recordsExposure: false }; }
    if (action === 'end') { if (!['running', 'paused'].includes(session.status)) throw new BadRequestException('Only an active session can end'); return { patch: { status: 'ended', ended_at: now, ended_reason: 'teacher_ended', expires_at: undefined }, eventType: 'session_ended', payload: {}, recordsExposure: false }; }
    if (session.status !== 'lobby') throw new BadRequestException('Only a lobby can be cancelled');
    return { patch: { status: 'cancelled', ended_at: now, ended_reason: 'teacher_cancelled', expires_at: undefined }, eventType: 'session_cancelled', payload: {}, recordsExposure: false };
  }

  private async assertRepertoireCards(cardIds: string[], categoryId: string, requester: Requester): Promise<LiveDomanCard[]> {
    const cards = await this.liveDomanRepository.findCardsByIds(cardIds);
    if (cards.length !== cardIds.length) throw new BadRequestException('One or more repertoire cards do not exist');
    for (const card of cards) { if (card.status !== 'active' || card.category_id !== categoryId || !this.canUseCard(card, requester)) throw new ForbiddenException('Every repertoire card must be active, from its category and accessible to its creator'); }
    return cards;
  }
  private async recoverExpiredSessions(dispatch = true): Promise<LiveDomanSession[]> {
    const expired = await this.liveDomanRepository.expireStaleSessions(new Date()) ?? [];
    for (const session of expired) {
      await this.enqueueSessionUpdate(session);
      await this.enqueueParticipants(session.id);
    }
    if (dispatch && expired.length) await this.flushRealtimeOutbox();
    return expired;
  }

  private async enqueueSessionUpdate(session: LiveDomanSession): Promise<void> {
    await this.enqueueRealtime({ kind: 'session_updated', session_id: session.id, payload: {}, dedupe_key: `session:${session.id}` });
  }

  private async enqueueParticipants(sessionId: string): Promise<void> {
    await this.enqueueRealtime({ kind: 'participants_updated', session_id: sessionId, payload: {}, dedupe_key: `participants:${sessionId}` });
  }

  private async enqueueRealtime(input: { kind: LiveDomanOutboxEvent['kind']; session_id: string; payload: Record<string, unknown>; dedupe_key: string }): Promise<void> {
    try { await this.liveDomanRepository.enqueueRealtimeEvent(input); }
    catch (error) { this.logger.error(`Unable to persist realtime outbox event for session ${input.session_id}`, error instanceof Error ? error.stack : undefined); }
  }

  private async flushRealtimeOutbox(): Promise<number> {
    let delivered = 0;
    const events = await this.liveDomanRepository.claimRealtimeEvents(new Date(), 50) ?? [];
    for (const event of events) {
      try {
        if (event.kind === 'session_created') {
          const session = await this.liveDomanRepository.findSession(event.session_id);
          if (session) await this.liveDomanRealtime.publishInvitations(session);
        } else if (event.kind === 'session_updated') {
          const session = await this.liveDomanRepository.findSession(event.session_id);
          if (session) await this.liveDomanRealtime.publishSession(session, this.studentProjection(session));
        } else {
          const participants = await this.liveDomanRepository.listParticipants(event.session_id);
          await this.liveDomanRealtime.publishParticipants(event.session_id, participants);
        }
        await this.liveDomanRepository.markRealtimeEventDelivered(event.id);
        delivered += 1;
      } catch (error) {
        const delay = Math.min(5 * 60_000, 1_000 * 2 ** Math.min(event.attempts, 8));
        await this.liveDomanRepository.retryRealtimeEvent(event.id, error instanceof Error ? error.message : 'Unknown realtime failure', new Date(Date.now() + delay));
        this.logger.warn(`Realtime event ${event.id} will be retried in ${delay}ms`);
      }
    }
    return delivered;
  }

  private studentProjection(session: LiveDomanSession): StudentLiveDomanSession {
    return {
      id: session.id,
      repertoire_snapshot: { name: session.repertoire_snapshot.name, cards: session.repertoire_snapshot.cards.map((card) => ({ position: card.position, display_text: card.display_text, ...(card.language ? { language: card.language } : {}), ...(card.audio_url ? { audio_url: card.audio_url } : {}) })) },
      presentation: session.presentation,
      status: session.status,
      active_card_index: session.active_card_index,
      presentation_sequence: session.presentation_sequence,
      ...(session.presentation_started_at ? { presentation_started_at: session.presentation_started_at } : {}),
      ...(session.paused_at ? { paused_at: session.paused_at } : {}),
      ...(session.ended_at ? { ended_at: session.ended_at } : {}),
      ...(session.expires_at ? { expires_at: session.expires_at } : {}),
    };
  }

  private lobbyExpiresAt(now: Date): Date { return new Date(now.getTime() + this.durationFromEnv('LIVE_DOMAN_LOBBY_TTL_MS', 30 * 60_000)); }
  private activeExpiresAt(now: Date): Date { return new Date(now.getTime() + this.durationFromEnv('LIVE_DOMAN_ACTIVE_TTL_MS', 2 * 60 * 60_000)); }
  private durationFromEnv(name: string, fallback: number): number { const value = Number(process.env[name]); return Number.isFinite(value) && value >= 60_000 ? value : fallback; }
  private canUseCard(card: LiveDomanCard, requester: Requester): boolean { return requester.role === 'admin' || card.created_by === requester.userId || card.sharing_scope === 'shared'; }
  private async assertCanViewSession(session: LiveDomanSession, requester: Requester): Promise<void> { if (requester.role === 'admin') return; if (requester.role === 'teacher') { if (session.teacher_id !== requester.userId) throw new ForbiddenException('Teachers can only view their own live sessions'); return; } if (!session.group_snapshot.student_ids.includes(requester.userId)) throw new ForbiddenException('Student is not invited to this live session'); }
  private assertTeacher(requester: Requester): void { if (requester.role === 'student') throw new ForbiddenException('Only teachers and administrators can manage live Doman resources'); }
  private async requireCard(id: string): Promise<LiveDomanCard> { if (!isMongoObjectId(id)) throw new BadRequestException('Invalid live Doman card id'); const card = await this.liveDomanRepository.findCard(id); if (!card) throw new NotFoundException('Live Doman card not found'); return card; }
  private async requireRepertoire(id: string): Promise<LiveDomanRepertoire> { if (!isMongoObjectId(id)) throw new BadRequestException('Invalid repertoire id'); const repertoire = await this.liveDomanRepository.findRepertoire(id); if (!repertoire) throw new NotFoundException('Live Doman repertoire not found'); return repertoire; }
  private async requireSession(id: string): Promise<LiveDomanSession> { if (!isMongoObjectId(id)) throw new BadRequestException('Invalid live session id'); const session = await this.liveDomanRepository.findSession(id); if (!session) throw new NotFoundException('Live Doman session not found'); return session; }
  private assertCardOwner(card: LiveDomanCard, requester: Requester): void { if (requester.role !== 'admin' && card.created_by !== requester.userId) throw new ForbiddenException('Only the card owner can edit this card'); }
  private assertRepertoireOwner(repertoire: LiveDomanRepertoire, requester: Requester): void { if (requester.role !== 'admin' && repertoire.created_by !== requester.userId) throw new ForbiddenException('Only the repertoire owner can use this repertoire'); }
  private normalize(value: string): string { return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO'); }
  private fingerprint(categoryId: string, word: string, language?: string, audioUrl?: string): string { return createHash('sha256').update([categoryId, word, language ?? '', audioUrl ?? ''].join('\u0000')).digest('hex'); }
  private rethrowDuplicateCard(error: unknown): void { if (error instanceof MongoServerError && error.code === 11000) throw new ConflictException('An active card with the same content already exists'); }
  private rethrowDuplicateRepertoire(error: unknown): void { if (error instanceof MongoServerError && error.code === 11000) throw new ConflictException('An active repertoire with this name already exists'); }
}
