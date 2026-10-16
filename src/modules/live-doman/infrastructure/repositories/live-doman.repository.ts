import { Inject, Injectable } from '@nestjs/common';
import type { Document } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import type { ILiveDomanRepository, LiveDomanCard, LiveDomanOutboxEvent, LiveDomanParticipant, LiveDomanRepertoire, LiveDomanSession } from '../../domain/interfaces/live-doman.repository.interface';

@Injectable()
export class LiveDomanRepository implements ILiveDomanRepository {
  constructor(@Inject(MONGO_CONNECTION) private readonly connection: Connection) {}

  private db() { const db = this.connection.db; if (!db) throw new Error('MongoDB connection is not ready'); return db; }
  private objectId(id: string) { return new Types.ObjectId(id); }
  private cards() { return this.db().collection<Document>('doman_cards'); }
  private repertoires() { return this.db().collection<Document>('doman_repertoires'); }
  private sessions() { return this.db().collection<Document>('doman_live_sessions'); }
  private participants() { return this.db().collection<Document>('doman_live_session_participants'); }
  private events() { return this.db().collection<Document>('doman_live_session_events'); }
  private exposures() { return this.db().collection<Document>('doman_live_exposures'); }
  private outbox() { return this.db().collection<Document>('doman_live_realtime_outbox'); }

  private toCard(doc: Document): LiveDomanCard {
    return { schema_version: doc.schema_version as 1, id: (doc._id as Types.ObjectId).toHexString(), word: doc.word as string, normalized_word: doc.normalized_word as string, display_text: doc.display_text as string, category_id: (doc.category_id as Types.ObjectId).toHexString(), created_by: (doc.created_by as Types.ObjectId).toHexString(), status: doc.status as LiveDomanCard['status'], sharing_scope: doc.sharing_scope as LiveDomanCard['sharing_scope'], language: doc.language as string | undefined, audio_url: doc.audio_url as string | undefined, learning_unit_id: (doc.learning_unit_id as Types.ObjectId | undefined)?.toHexString(), content_fingerprint: doc.content_fingerprint as string, created_at: doc.created_at as Date, updated_at: doc.updated_at as Date };
  }
  private toRepertoire(doc: Document): LiveDomanRepertoire {
    return { schema_version: doc.schema_version as 1, id: (doc._id as Types.ObjectId).toHexString(), name: doc.name as string, normalized_name: doc.normalized_name as string, stage: doc.stage as LiveDomanRepertoire['stage'], category_id: (doc.category_id as Types.ObjectId).toHexString(), card_ids: (doc.card_ids as Types.ObjectId[]).map((id) => id.toHexString()), created_by: (doc.created_by as Types.ObjectId).toHexString(), status: doc.status as LiveDomanRepertoire['status'], presentation: doc.presentation as LiveDomanRepertoire['presentation'], description: doc.description as string | undefined, created_at: doc.created_at as Date, updated_at: doc.updated_at as Date };
  }
  private toSession(doc: Document): LiveDomanSession {
    const groupSnapshot = doc.group_snapshot as { name: string; student_ids: Types.ObjectId[] };
    const repertoire = doc.repertoire_snapshot as { name: string; stage: LiveDomanRepertoire['stage']; category_id: Types.ObjectId; cards: Array<{ position: number; card_id: Types.ObjectId; word: string; display_text: string; language?: string; audio_url?: string }> };
    return { schema_version: doc.schema_version as 1, id: (doc._id as Types.ObjectId).toHexString(), teacher_id: (doc.teacher_id as Types.ObjectId).toHexString(), group_id: (doc.group_id as Types.ObjectId).toHexString(), repertoire_id: (doc.repertoire_id as Types.ObjectId).toHexString(), group_snapshot: { name: groupSnapshot.name, student_ids: groupSnapshot.student_ids.map((id) => id.toHexString()) }, repertoire_snapshot: { name: repertoire.name, stage: repertoire.stage, category_id: repertoire.category_id.toHexString(), cards: repertoire.cards.map((card) => ({ ...card, card_id: card.card_id.toHexString() })) }, presentation: doc.presentation as LiveDomanSession['presentation'], status: doc.status as LiveDomanSession['status'], active_card_index: doc.active_card_index as number | null, presentation_sequence: doc.presentation_sequence as number, presentation_started_at: doc.presentation_started_at as Date | undefined, paused_at: doc.paused_at as Date | undefined, started_at: doc.started_at as Date | undefined, ended_at: doc.ended_at as Date | undefined, expires_at: doc.expires_at as Date | undefined, ended_reason: doc.ended_reason as LiveDomanSession['ended_reason'], created_at: doc.created_at as Date, updated_at: doc.updated_at as Date };
  }
  private toParticipant(doc: Document): LiveDomanParticipant {
    return { session_id: (doc.session_id as Types.ObjectId).toHexString(), student_id: (doc.student_id as Types.ObjectId).toHexString(), connection_state: doc.connection_state as LiveDomanParticipant['connection_state'], current_ack_sequence: doc.current_ack_sequence as number, invited_at: doc.invited_at as Date, joined_at: doc.joined_at as Date | undefined, last_seen_at: doc.last_seen_at as Date | undefined };
  }

  async listCards(requesterId: string, includeShared: boolean): Promise<LiveDomanCard[]> {
    const query = includeShared ? { status: 'active' } : { status: 'active', $or: [{ created_by: this.objectId(requesterId) }, { sharing_scope: 'shared' }] };
    return (await this.cards().find(query).sort({ word: 1 }).toArray()).map((doc) => this.toCard(doc));
  }
  async findCard(id: string): Promise<LiveDomanCard | null> { if (!Types.ObjectId.isValid(id)) return null; const doc = await this.cards().findOne({ _id: this.objectId(id) }); return doc ? this.toCard(doc) : null; }
  async createCard(payload: Omit<LiveDomanCard, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanCard> {
    const now = new Date(); const doc: Document = { ...payload, category_id: this.objectId(payload.category_id), created_by: this.objectId(payload.created_by), ...(payload.learning_unit_id ? { learning_unit_id: this.objectId(payload.learning_unit_id) } : {}), created_at: now, updated_at: now }; const result = await this.cards().insertOne(doc); const inserted = await this.cards().findOne({ _id: result.insertedId }); if (!inserted) throw new Error('Live Doman card insert failed'); return this.toCard(inserted);
  }
  async updateCard(id: string, patch: Partial<LiveDomanCard>): Promise<LiveDomanCard | null> { if (!Types.ObjectId.isValid(id)) return null; const $set: Document = { ...patch, updated_at: new Date() }; const $unset: Document = {}; delete $set.id; delete $set.created_at; delete $set.updated_at; for (const field of ['language', 'audio_url']) { if (field in patch && $set[field] === undefined) { delete $set[field]; $unset[field] = ''; } } if (typeof $set.category_id === 'string') $set.category_id = this.objectId($set.category_id as string); const update: Document = { $set }; if (Object.keys($unset).length) update.$unset = $unset; await this.cards().updateOne({ _id: this.objectId(id) }, update); const doc = await this.cards().findOne({ _id: this.objectId(id) }); return doc ? this.toCard(doc) : null; }
  async listRepertoires(requesterId: string, includeShared: boolean): Promise<LiveDomanRepertoire[]> { const query = includeShared ? { status: 'active' } : { status: 'active', created_by: this.objectId(requesterId) }; return (await this.repertoires().find(query).sort({ updated_at: -1 }).toArray()).map((doc) => this.toRepertoire(doc)); }
  async findRepertoire(id: string): Promise<LiveDomanRepertoire | null> { if (!Types.ObjectId.isValid(id)) return null; const doc = await this.repertoires().findOne({ _id: this.objectId(id) }); return doc ? this.toRepertoire(doc) : null; }
  async createRepertoire(payload: Omit<LiveDomanRepertoire, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanRepertoire> { const now = new Date(); const doc: Document = { ...payload, category_id: this.objectId(payload.category_id), card_ids: payload.card_ids.map((id) => this.objectId(id)), created_by: this.objectId(payload.created_by), created_at: now, updated_at: now }; const result = await this.repertoires().insertOne(doc); const inserted = await this.repertoires().findOne({ _id: result.insertedId }); if (!inserted) throw new Error('Live Doman repertoire insert failed'); return this.toRepertoire(inserted); }
  async updateRepertoire(id: string, patch: Partial<LiveDomanRepertoire>): Promise<LiveDomanRepertoire | null> { if (!Types.ObjectId.isValid(id)) return null; const $set: Document = { ...patch, updated_at: new Date() }; delete $set.id; delete $set.created_at; delete $set.updated_at; if (typeof $set.category_id === 'string') $set.category_id = this.objectId($set.category_id as string); if (Array.isArray($set.card_ids)) $set.card_ids = ($set.card_ids as string[]).map((cardId) => this.objectId(cardId)); await this.repertoires().updateOne({ _id: this.objectId(id) }, { $set }); const doc = await this.repertoires().findOne({ _id: this.objectId(id) }); return doc ? this.toRepertoire(doc) : null; }
  async findCardsByIds(ids: string[]): Promise<LiveDomanCard[]> { const valid = ids.filter((id) => Types.ObjectId.isValid(id)); if (valid.length === 0) return []; const docs = await this.cards().find({ _id: { $in: valid.map((id) => this.objectId(id)) } }).toArray(); const byId = new Map(docs.map((doc) => [((doc._id as Types.ObjectId).toHexString()), this.toCard(doc)])); return valid.map((id) => byId.get(id)).filter((card): card is LiveDomanCard => Boolean(card)); }
  async createSession(session: Omit<LiveDomanSession, 'id' | 'created_at' | 'updated_at'>): Promise<LiveDomanSession> {
    const now = new Date(); const doc: Document = { ...session, teacher_id: this.objectId(session.teacher_id), group_id: this.objectId(session.group_id), repertoire_id: this.objectId(session.repertoire_id), group_active_key: this.objectId(session.group_id), group_snapshot: { ...session.group_snapshot, student_ids: session.group_snapshot.student_ids.map((id) => this.objectId(id)) }, repertoire_snapshot: { ...session.repertoire_snapshot, category_id: this.objectId(session.repertoire_snapshot.category_id), cards: session.repertoire_snapshot.cards.map((card) => ({ ...card, card_id: this.objectId(card.card_id) })) }, created_at: now, updated_at: now };
    const inserted = await this.sessions().insertOne(doc);
    try { await this.participants().insertMany(session.group_snapshot.student_ids.map((studentId) => ({ session_id: inserted.insertedId, student_id: this.objectId(studentId), invited_at: now, connection_state: 'invited', active_student_key: null, current_ack_sequence: 0, created_at: now, updated_at: now }))); await this.events().insertOne({ session_id: inserted.insertedId, sequence: 0, event_type: 'lobby_opened', actor_type: 'teacher', actor_id: this.objectId(session.teacher_id), payload: {}, occurred_at: now }); } catch (error) { await this.participants().deleteMany({ session_id: inserted.insertedId }); await this.sessions().deleteOne({ _id: inserted.insertedId }); throw error; }
    const saved = await this.sessions().findOne({ _id: inserted.insertedId }); if (!saved) throw new Error('Live Doman session insert failed'); return this.toSession(saved);
  }
  async findSession(id: string): Promise<LiveDomanSession | null> { if (!Types.ObjectId.isValid(id)) return null; const doc = await this.sessions().findOne({ _id: this.objectId(id) }); return doc ? this.toSession(doc) : null; }
  async listSessionsForStudent(studentId: string): Promise<LiveDomanSession[]> { if (!Types.ObjectId.isValid(studentId)) return []; const participants = await this.participants().find({ student_id: this.objectId(studentId), connection_state: { $ne: 'left' } }).toArray(); const sessionIds = participants.map((item) => item.session_id as Types.ObjectId); if (!sessionIds.length) return []; return (await this.sessions().find({ _id: { $in: sessionIds }, status: { $in: ['lobby', 'running', 'paused'] } }).sort({ updated_at: -1 }).toArray()).map((doc) => this.toSession(doc)); }
  async listParticipants(sessionId: string): Promise<LiveDomanParticipant[]> { if (!Types.ObjectId.isValid(sessionId)) return []; return (await this.participants().find({ session_id: this.objectId(sessionId) }).sort({ invited_at: 1 }).toArray()).map((doc) => this.toParticipant(doc)); }
  async joinSession(sessionId: string, studentId: string): Promise<LiveDomanParticipant | null> { if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(studentId)) return null; const now = new Date(); const result = await this.participants().findOneAndUpdate({ session_id: this.objectId(sessionId), student_id: this.objectId(studentId) }, { $set: { connection_state: 'ready', joined_at: now, last_seen_at: now, updated_at: now } }, { returnDocument: 'after' }); return result ? this.toParticipant(result) : null; }
  async touchParticipant(sessionId: string, studentId: string): Promise<boolean> { if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(studentId)) return false; const now = new Date(); const result = await this.participants().updateOne({ session_id: this.objectId(sessionId), student_id: this.objectId(studentId), connection_state: { $ne: 'left' } }, { $set: { connection_state: 'connected', last_seen_at: now, updated_at: now } }); return result.matchedCount > 0; }
  async markStaleParticipants(now: Date, staleBefore: Date): Promise<string[]> { const stale = await this.participants().find({ connection_state: { $in: ['connected', 'ready'] }, last_seen_at: { $lt: staleBefore } }, { projection: { session_id: 1 } }).toArray(); if (!stale.length) return []; await this.participants().updateMany({ connection_state: { $in: ['connected', 'ready'] }, last_seen_at: { $lt: staleBefore } }, { $set: { connection_state: 'disconnected', updated_at: now } }); return [...new Set(stale.map((participant) => (participant.session_id as Types.ObjectId).toHexString()))]; }
  async setParticipantActivity(sessionId: string, active: boolean): Promise<void> { if (!Types.ObjectId.isValid(sessionId)) return; const now = new Date(); if (active) { await this.participants().updateMany({ session_id: this.objectId(sessionId) }, { $set: { active_student_key: 'live', updated_at: now } }); return; } await this.participants().updateMany({ session_id: this.objectId(sessionId) }, { $set: { active_student_key: null, updated_at: now } }); }
  async findSessionCommand(sessionId: string, commandId: string): Promise<LiveDomanSession | null> { if (!Types.ObjectId.isValid(sessionId)) return null; const event = await this.events().findOne({ session_id: this.objectId(sessionId), command_id: commandId }); return event ? this.findSession(sessionId) : null; }
  async applySessionCommand(sessionId: string, expectedSequence: number, patch: Partial<LiveDomanSession>, event: { command_id: string; event_type: string; actor_id: string; actor_type: 'teacher' | 'student' | 'system'; payload: Record<string, unknown> }): Promise<LiveDomanSession | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null; const $set: Document = { ...patch, updated_at: new Date() }; const $unset: Document = {}; delete $set.id; delete $set.created_at; delete $set.updated_at; if ($set.ended_reason === undefined) delete $set.ended_reason; if ('paused_at' in patch && patch.paused_at === undefined) { delete $set.paused_at; $unset.paused_at = ''; } if ('expires_at' in patch && patch.expires_at === undefined) { delete $set.expires_at; $unset.expires_at = ''; } if (patch.status === 'ended' || patch.status === 'cancelled') { delete $set.group_active_key; $unset.group_active_key = ''; } const update: Document = { $set, $inc: { presentation_sequence: 1 } }; if (Object.keys($unset).length) update.$unset = $unset; const result = await this.sessions().findOneAndUpdate({ _id: this.objectId(sessionId), presentation_sequence: expectedSequence }, update, { returnDocument: 'after' }); if (!result) return null; const saved = this.toSession(result); await this.events().insertOne({ session_id: this.objectId(sessionId), sequence: saved.presentation_sequence, command_id: event.command_id, event_type: event.event_type, actor_type: event.actor_type, actor_id: this.objectId(event.actor_id), payload: event.payload, occurred_at: new Date() }); return saved;
  }
  async recordExposures(session: LiveDomanSession): Promise<void> { if (session.active_card_index === null) return; const card = session.repertoire_snapshot.cards[session.active_card_index]; if (!card) return; const participants = await this.participants().find({ session_id: this.objectId(session.id) }).toArray(); const now = new Date(); if (!participants.length) return; await this.exposures().bulkWrite(participants.map((participant) => ({ updateOne: { filter: { session_id: this.objectId(session.id), student_id: participant.student_id, presentation_sequence: session.presentation_sequence }, update: { $setOnInsert: { session_id: this.objectId(session.id), student_id: participant.student_id, presentation_sequence: session.presentation_sequence, card_id: this.objectId(card.card_id), card_index: card.position, emitted_at: now, rendered_at: null, acknowledged_at: null, visibility_duration_ms: null, delivery_status: 'emitted', created_at: now, updated_at: now } }, upsert: true } }))); }
  async acknowledge(sessionId: string, studentId: string, sequence: number): Promise<boolean> { if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(studentId)) return false; const now = new Date(); const participant = await this.participants().updateOne({ session_id: this.objectId(sessionId), student_id: this.objectId(studentId) }, { $max: { current_ack_sequence: sequence }, $set: { last_seen_at: now, updated_at: now } }); if (!participant.matchedCount) return false; await this.exposures().updateOne({ session_id: this.objectId(sessionId), student_id: this.objectId(studentId), presentation_sequence: sequence }, { $set: { rendered_at: now, acknowledged_at: now, delivery_status: 'rendered', updated_at: now } }); return true; }
  async createObservation(payload: { session_id: string; student_id: string; recorded_by: string; kind: 'engagement' | 'attention' | 'observed_response' | 'follow_up'; value: 'observed' | 'not_observed' | 'needs_follow_up'; note?: string }): Promise<void> { const now = new Date(); await this.db().collection<Document>('doman_student_observations').updateOne({ session_id: this.objectId(payload.session_id), student_id: this.objectId(payload.student_id), kind: payload.kind }, { $set: { recorded_by: this.objectId(payload.recorded_by), value: payload.value, ...(payload.note !== undefined ? { note: payload.note } : {}), updated_at: now }, $setOnInsert: { session_id: this.objectId(payload.session_id), student_id: this.objectId(payload.student_id), kind: payload.kind, created_at: now } }, { upsert: true }); }

  async expireStaleSessions(now: Date): Promise<LiveDomanSession[]> {
    const candidates = await this.sessions().find({ status: { $in: ['lobby', 'running', 'paused'] }, expires_at: { $lte: now } }).limit(100).toArray();
    const expired: LiveDomanSession[] = [];
    for (const candidate of candidates) {
      const result = await this.sessions().findOneAndUpdate(
        { _id: candidate._id, status: { $in: ['lobby', 'running', 'paused'] }, expires_at: { $lte: now } },
        { $set: { status: 'cancelled', ended_at: now, ended_reason: 'expired', updated_at: now }, $unset: { group_active_key: '', expires_at: '' }, $inc: { presentation_sequence: 1 } },
        { returnDocument: 'after' },
      );
      if (!result) continue;
      const session = this.toSession(result);
      await this.participants().updateMany({ session_id: candidate._id }, { $set: { active_student_key: null, updated_at: now } });
      await this.events().insertOne({ session_id: candidate._id, sequence: session.presentation_sequence, event_type: 'session_expired', actor_type: 'system', payload: {}, occurred_at: now });
      expired.push(session);
    }
    return expired;
  }

  async enqueueRealtimeEvent(input: { kind: LiveDomanOutboxEvent['kind']; session_id: string; payload: Record<string, unknown>; dedupe_key: string }): Promise<void> {
    const now = new Date();
    await this.outbox().updateOne(
      { dedupe_key: input.dedupe_key },
      { $set: { kind: input.kind, session_id: this.objectId(input.session_id), payload: input.payload, status: 'pending', available_at: now, updated_at: now, last_error: null }, $setOnInsert: { dedupe_key: input.dedupe_key, attempts: 0, created_at: now } },
      { upsert: true },
    );
  }

  async claimRealtimeEvents(now: Date, limit: number): Promise<LiveDomanOutboxEvent[]> {
    const events: LiveDomanOutboxEvent[] = [];
    for (let index = 0; index < limit; index += 1) {
      const result = await this.outbox().findOneAndUpdate(
        { $or: [{ status: 'pending', available_at: { $lte: now } }, { status: 'processing', claimed_at: { $lte: new Date(now.getTime() - 5 * 60_000) } }] },
        { $set: { status: 'processing', claimed_at: now, updated_at: now }, $inc: { attempts: 1 } },
        { sort: { available_at: 1, created_at: 1 }, returnDocument: 'after' },
      );
      if (!result) break;
      events.push({ id: (result._id as Types.ObjectId).toHexString(), kind: result.kind as LiveDomanOutboxEvent['kind'], session_id: (result.session_id as Types.ObjectId).toHexString(), attempts: result.attempts as number, available_at: result.available_at as Date, payload: (result.payload ?? {}) as Record<string, unknown> });
    }
    return events;
  }

  async markRealtimeEventDelivered(id: string): Promise<void> {
    await this.outbox().updateOne({ _id: this.objectId(id) }, { $set: { status: 'delivered', delivered_at: new Date(), updated_at: new Date() } });
  }

  async retryRealtimeEvent(id: string, error: string, availableAt: Date): Promise<void> {
    await this.outbox().updateOne({ _id: this.objectId(id) }, { $set: { status: 'pending', available_at: availableAt, last_error: error.slice(0, 500), updated_at: new Date() } });
  }
}
