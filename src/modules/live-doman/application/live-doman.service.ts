import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { CategoriesService } from '../../categories/application/categories.service';
import { GroupsService } from '../../groups/application/groups.service';
import { LIVE_DOMAN_REPOSITORY } from '../domain/constants/live-doman.tokens';
import type { ILiveDomanRepository, LiveDomanCard, LiveDomanRepertoire, LiveDomanSession } from '../domain/interfaces/live-doman.repository.interface';
import { AcknowledgeLiveSessionDto, CreateLiveCardDto, CreateLiveObservationDto, CreateLiveSessionDto, CreateRepertoireDto, LiveSessionCommandDto, UpdateLiveCardDto } from '../dto/live-doman.dto';

type Requester = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class LiveDomanService {
  constructor(
    @Inject(LIVE_DOMAN_REPOSITORY) private readonly liveDomanRepository: ILiveDomanRepository,
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
        description: dto.description?.trim() || undefined,
        presentation: { default_pacing: dto.default_pacing ?? 'teacher_controlled', default_display_ms: dto.default_display_ms ?? 1000, audio_policy: dto.audio_policy ?? 'teacher_voice' },
      });
    } catch (error) { this.rethrowDuplicateRepertoire(error); throw error; }
  }

  async createSession(dto: CreateLiveSessionDto, requester: Requester): Promise<LiveDomanSession> {
    this.assertTeacher(requester);
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
    const presentation = { pacing: dto.pacing ?? repertoire.presentation.default_pacing, display_ms: dto.display_ms ?? repertoire.presentation.default_display_ms, audio_policy: repertoire.presentation.audio_policy };
    try {
      return await this.liveDomanRepository.createSession({
        schema_version: 1, teacher_id: requester.userId, group_id: group.id, repertoire_id: repertoire.id,
        group_snapshot: { name: group.name, student_ids: group.student_ids },
        repertoire_snapshot: { name: repertoire.name, stage: repertoire.stage, category_id: repertoire.category_id, cards: repertoire.card_ids.map((cardId, position) => { const card = ordered.get(cardId); if (!card) throw new BadRequestException('A repertoire card is missing'); return { position, card_id: card.id, word: card.word, display_text: card.display_text, ...(card.language ? { language: card.language } : {}), ...(card.audio_url ? { audio_url: card.audio_url } : {}) }; }) },
        presentation, status: 'lobby', active_card_index: null, presentation_sequence: 0,
      });
    } catch (error) { if (error instanceof MongoServerError && error.code === 11000) throw new ConflictException('This group already has a live session'); throw error; }
  }

  async getSession(id: string, requester: Requester): Promise<unknown> {
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    return requester.role === 'student' ? { session } : { session, participants: await this.liveDomanRepository.listParticipants(id) };
  }

  async getCurrentSessions(requester: Requester): Promise<LiveDomanSession[]> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students have a current live-session feed');
    return this.liveDomanRepository.listSessionsForStudent(requester.userId);
  }

  async joinSession(id: string, requester: Requester): Promise<unknown> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students can join a live session');
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    const participant = await this.liveDomanRepository.joinSession(id, requester.userId);
    if (!participant) throw new NotFoundException('Student is not invited to this live session');
    return { session, participant };
  }

  async command(id: string, dto: LiveSessionCommandDto, requester: Requester): Promise<LiveDomanSession> {
    this.assertTeacher(requester);
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
    return updated;
  }

  async acknowledge(id: string, dto: AcknowledgeLiveSessionDto, requester: Requester): Promise<void> {
    if (requester.role !== 'student') throw new ForbiddenException('Only students can acknowledge a live presentation');
    const session = await this.requireSession(id);
    await this.assertCanViewSession(session, requester);
    if (dto.sequence > session.presentation_sequence) throw new BadRequestException('Cannot acknowledge a future presentation');
    const acknowledged = await this.liveDomanRepository.acknowledge(id, requester.userId, dto.sequence);
    if (!acknowledged) throw new NotFoundException('Student is not invited to this live session');
  }

  async observe(id: string, dto: CreateLiveObservationDto, requester: Requester): Promise<void> {
    this.assertTeacher(requester);
    const session = await this.requireSession(id);
    if (requester.role === 'teacher' && session.teacher_id !== requester.userId) throw new ForbiddenException('Only the session teacher can record observations');
    if (!session.group_snapshot.student_ids.includes(dto.student_id)) throw new BadRequestException('The student is not part of this live session');
    await this.liveDomanRepository.createObservation({ session_id: id, student_id: dto.student_id, recorded_by: requester.userId, kind: dto.kind, value: dto.value, note: dto.note?.trim() || undefined });
  }

  private commandMutation(session: LiveDomanSession, action: LiveSessionCommandDto['action'], now: Date): { patch: Partial<LiveDomanSession>; eventType: string; payload: Record<string, unknown>; recordsExposure: boolean } {
    if (action === 'start') { if (session.status !== 'lobby') throw new BadRequestException('Only a lobby can start'); return { patch: { status: 'running', active_card_index: 0, presentation_started_at: now, started_at: now }, eventType: 'session_started', payload: { card_index: 0 }, recordsExposure: true }; }
    if (action === 'next') { if (session.status !== 'running' || session.active_card_index === null) throw new BadRequestException('Only a running session can advance'); const next = session.active_card_index + 1; if (next >= session.repertoire_snapshot.cards.length) throw new BadRequestException('This is the last card. End the session when the group is ready.'); return { patch: { active_card_index: next, presentation_started_at: now }, eventType: 'card_presented', payload: { card_index: next }, recordsExposure: true }; }
    if (action === 'repeat') { if (session.status !== 'running' || session.active_card_index === null) throw new BadRequestException('Only a visible card can be repeated'); return { patch: { presentation_started_at: now }, eventType: 'card_repeated', payload: { card_index: session.active_card_index }, recordsExposure: true }; }
    if (action === 'pause') { if (session.status !== 'running') throw new BadRequestException('Only a running session can pause'); return { patch: { status: 'paused', paused_at: now }, eventType: 'session_paused', payload: {}, recordsExposure: false }; }
    if (action === 'resume') { if (session.status !== 'paused') throw new BadRequestException('Only a paused session can resume'); return { patch: { status: 'running', paused_at: undefined }, eventType: 'session_resumed', payload: {}, recordsExposure: false }; }
    if (action === 'end') { if (!['running', 'paused'].includes(session.status)) throw new BadRequestException('Only an active session can end'); return { patch: { status: 'ended', ended_at: now, ended_reason: 'teacher_ended' }, eventType: 'session_ended', payload: {}, recordsExposure: false }; }
    if (session.status !== 'lobby') throw new BadRequestException('Only a lobby can be cancelled');
    return { patch: { status: 'cancelled', ended_at: now, ended_reason: 'teacher_cancelled' }, eventType: 'session_cancelled', payload: {}, recordsExposure: false };
  }

  private async assertRepertoireCards(cardIds: string[], categoryId: string, requester: Requester): Promise<LiveDomanCard[]> {
    const cards = await this.liveDomanRepository.findCardsByIds(cardIds);
    if (cards.length !== cardIds.length) throw new BadRequestException('One or more repertoire cards do not exist');
    for (const card of cards) { if (card.status !== 'active' || card.category_id !== categoryId || !this.canUseCard(card, requester)) throw new ForbiddenException('Every repertoire card must be active, from its category and accessible to its creator'); }
    return cards;
  }
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
