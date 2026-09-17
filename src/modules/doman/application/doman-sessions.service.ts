import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_EXPOSURE_LOGS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import type { DomanDailyPlan } from '../domain/interfaces/doman-daily-plan.interface';
import { IDailyPlansRepository } from '../domain/interfaces/daily-plans.repository.interface';
import { IDomanExposureLogsRepository } from '../domain/interfaces/doman-exposure-logs.repository.interface';
import { IDomanSessionCardsRepository } from '../domain/interfaces/doman-session-cards.repository.interface';
import { DomanSession } from '../domain/interfaces/doman-session.interface';
import { IDomanSessionsRepository } from '../domain/interfaces/doman-sessions.repository.interface';
import type { IStudyPlansRepository } from '../domain/interfaces/study-plans.repository.interface';
import { StudentDomanProgressSummary } from '../domain/interfaces/student-doman-progress-summary.interface';
import { DomanRequester } from '../domain/types/doman-requester.type';
import { CompleteSessionDto } from '../dto/complete-session.dto';
import { AddDomanSessionsDto } from '../dto/add-doman-sessions.dto';
import { CreateDomanSessionDto } from '../dto/create-doman-session.dto';
import { CreateExposureEventDto } from '../dto/create-exposure-event.dto';
import { ListDomanSessionsQueryDto } from '../dto/list-doman-sessions-query.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateDomanSessionDto } from '../dto/update-doman-session.dto';
import { selectDefaultCategoryId } from './default-category.util';
import {
  assertCanAccessStudent,
  assertCanManageDoman,
  isSameObjectId,
} from './doman-authorization.util';
import { todayPlanDateUtcMidnight } from './plan-date.util';

@Injectable()
export class DomanSessionsService {
  constructor(
    @Inject(DOMAN_SESSIONS_REPOSITORY)
    private readonly sessionsRepository: IDomanSessionsRepository,
    @Inject(DAILY_PLANS_REPOSITORY)
    private readonly dailyPlansRepository: IDailyPlansRepository,
    @Inject(DOMAN_SESSION_CARDS_REPOSITORY)
    private readonly sessionCardsRepository: IDomanSessionCardsRepository,
    @Inject(DOMAN_EXPOSURE_LOGS_REPOSITORY)
    private readonly exposureLogsRepository: IDomanExposureLogsRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
    @Inject(STUDY_PLANS_REPOSITORY)
    private readonly studyPlansRepository: IStudyPlansRepository,
  ) {}

  async list(
    query: ListDomanSessionsQueryDto,
    requester: DomanRequester,
  ): Promise<DomanSession[]> {
    if (!isMongoObjectId(query.daily_plan_id)) {
      throw new BadRequestException('Invalid daily_plan_id');
    }
    const plan = await this.requireDailyPlan(query.daily_plan_id);
    assertCanAccessStudent(requester, plan.student_id);
    return this.sessionsRepository.findByDailyPlanId(query.daily_plan_id);
  }

  async getById(id: string, requester: DomanRequester): Promise<DomanSession> {
    const session = await this.requireSession(id);
    assertCanAccessStudent(requester, session.student_id);
    return session;
  }

  private async requireSession(id: string): Promise<DomanSession> {
    if (!isMongoObjectId(id)) {
      throw new BadRequestException('Invalid session id');
    }
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Doman session not found');
    }
    return session;
  }

  async getDetailedById(id: string, requester: DomanRequester): Promise<unknown> {
    const session = await this.getById(id, requester);
    return this.toDetailedSession(session);
  }

  async getNext(
    query: StudentIdQueryDto,
    requester: DomanRequester,
  ): Promise<unknown> {
    if (!isMongoObjectId(query.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, query.student_id);
    if (
      query.category_id !== undefined &&
      !isMongoObjectId(query.category_id)
    ) {
      throw new BadRequestException('Invalid category_id');
    }
    const categoryId =
      query.category_id ?? (await this.resolveDefaultCategoryId(query.student_id));
    if (!categoryId) {
      throw new NotFoundException('No daily plan found for today');
    }
    const today = todayPlanDateUtcMidnight();
    const plan = await this.dailyPlansRepository.findByStudentAndPlanDate(
      query.student_id,
      today,
      categoryId,
    );
    if (!plan) {
      throw new NotFoundException('No daily plan found for today');
    }
    const sessions = await this.sessionsRepository.findByDailyPlanId(plan.id);
    const nextSession =
      sessions.find((session) => session.status === 'in_progress') ??
      sessions.find((session) => session.status === 'planned');
    if (!nextSession) {
      throw new NotFoundException('No pending sessions found');
    }
    return this.toDetailedSession(nextSession);
  }

  async getHistory(studentId: string, requester: DomanRequester): Promise<unknown> {
    if (!isMongoObjectId(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, studentId);
    const sessions = await this.sessionsRepository.findByStudentAndStatuses(
      studentId,
      ['completed', 'cancelled'],
    );
    return sessions.map((session) => ({
      session_id: session.id,
      daily_plan_id: session.daily_plan_id,
      category_id: session.category_id,
      session_index: session.session_index,
      status: session.status,
      display_ms: session.display_ms,
      started_at: session.started_at,
      completed_at: session.completed_at,
    }));
  }

  async getProgressSummary(
    studentId: string,
    requester: DomanRequester,
  ): Promise<StudentDomanProgressSummary> {
    if (!isMongoObjectId(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, studentId);
    const sessions = await this.sessionsRepository.findByStudentAndStatuses(studentId, [
      'planned',
      'in_progress',
      'completed',
      'cancelled',
    ]);
    const cards = await this.wordCardsRepository.listByStudentId(studentId);
    const exposures = await this.exposureLogsRepository.listByStudent(studentId);
    return {
      student_id: studentId,
      planned_sessions_count: sessions.filter((session) => session.status === 'planned').length,
      in_progress_sessions_count: sessions.filter(
        (session) => session.status === 'in_progress',
      ).length,
      completed_sessions_count: sessions.filter((session) => session.status === 'completed').length,
      cards_new_count: cards.filter((card) => card.status === 'new').length,
      cards_active_count: cards.filter((card) => card.status === 'active').length,
      cards_completed_count: cards.filter((card) => card.status === 'completed').length,
      last_activity_at: exposures[0]?.event_ts,
    };
  }

  async start(id: string, requester: DomanRequester): Promise<unknown> {
    const session = await this.getById(id, requester);
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new BadRequestException('Session is already closed');
    }
    if (session.status === 'in_progress') {
      return this.toDetailedSession(session);
    }
    const updated = await this.sessionsRepository.update(id, {
      status: 'in_progress',
      startedAt: session.started_at ?? new Date(),
    });
    if (!updated) {
      throw new NotFoundException('Doman session not found');
    }
    return this.toDetailedSession(updated);
  }

  async registerExposure(
    id: string,
    dto: CreateExposureEventDto,
    requester: DomanRequester,
  ): Promise<unknown> {
    const session = await this.getById(id, requester);
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new BadRequestException('Cannot register exposure on a closed session');
    }
    const now = new Date();
    if (dto.event_type !== 'session_finished') {
      if (!dto.word_card_id) {
        throw new BadRequestException('word_card_id is required for card events');
      }
      const sessionCard = await this.sessionCardsRepository.findBySessionIdAndWordCardId(
        id,
        dto.word_card_id,
      );
      if (!sessionCard) {
        throw new BadRequestException('word_card_id does not belong to the session');
      }
      if (dto.event_type === 'card_shown') {
        await this.sessionCardsRepository.touchDisplayedAt(id, dto.word_card_id, now);
        const currentCard = await this.wordCardsRepository.findById(dto.word_card_id);
        await this.wordCardsRepository.applyExposure(dto.word_card_id, {
          lastShownAt: now,
          timesShownIncrement: 1,
          status:
            currentCard?.status === 'new'
              ? 'active'
              : currentCard?.status === 'active' ||
                  currentCard?.status === 'completed' ||
                  currentCard?.status === 'archived'
                ? currentCard.status
                : undefined,
        });
      }
      if (dto.event_type === 'audio_played') {
        await this.sessionCardsRepository.touchAudioPlayedAt(id, dto.word_card_id, now);
        await this.wordCardsRepository.applyExposure(dto.word_card_id, {
          timesAudioPlayedIncrement: 1,
        });
      }
    }

    return this.exposureLogsRepository.create({
      studentId: session.student_id,
      sessionId: id,
      wordCardId: dto.word_card_id,
      eventType: dto.event_type,
      eventTs: now,
      displayMs: dto.display_ms,
      device: dto.device,
      metadata: dto.metadata,
    });
  }

  async complete(
    id: string,
    dto: CompleteSessionDto,
    requester: DomanRequester,
  ): Promise<unknown> {
    const session = await this.getById(id, requester);
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new BadRequestException('Session is already closed');
    }
    const now = new Date();
    const updated = await this.sessionsRepository.update(id, {
      status: 'completed',
      startedAt: session.started_at ?? now,
      completedAt: now,
    });
    if (!updated) {
      throw new NotFoundException('Doman session not found');
    }

    const cards = await this.sessionCardsRepository.listBySessionId(id);
    for (const card of cards) {
      const shownCount = await this.exposureLogsRepository.countByWordCardAndType(
        card.word_card_id,
        'card_shown',
      );
      const nextStatus = shownCount >= 3 ? 'completed' : 'active';
      await this.wordCardsRepository.applyExposure(card.word_card_id, {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? now : null,
      });
    }

    await this.exposureLogsRepository.create({
      studentId: session.student_id,
      sessionId: id,
      eventType: 'session_finished',
      eventTs: now,
      device: dto.device,
      metadata: dto.metadata,
    });

    return this.toDetailedSession(updated);
  }

  async create(
    dto: CreateDomanSessionDto,
    requester: DomanRequester,
  ): Promise<DomanSession> {
    assertCanManageDoman(requester);
    const plan = await this.requireDailyPlan(dto.daily_plan_id);
    if (!isSameObjectId(plan.student_id, dto.student_id)) {
      throw new BadRequestException('student_id does not match the daily plan');
    }
    if (!isSameObjectId(plan.category_id, dto.category_id)) {
      throw new BadRequestException('category_id does not match the daily plan');
    }
    return this.sessionsRepository.create({
      studentId: dto.student_id,
      dailyPlanId: dto.daily_plan_id,
      sessionIndex: dto.session_index,
      categoryId: dto.category_id,
      displayMs: dto.display_ms,
      audioMode: dto.audio_mode,
      status: dto.status ?? 'planned',
      mode: dto.mode,
    });
  }

  async update(
    id: string,
    dto: UpdateDomanSessionDto,
    requester: DomanRequester,
  ): Promise<DomanSession> {
    assertCanManageDoman(requester);
    const session = await this.requireSession(id);
    if (dto.category_id !== undefined) {
      const plan = await this.requireDailyPlan(session.daily_plan_id);
      if (!isSameObjectId(plan.category_id, dto.category_id)) {
        throw new BadRequestException('category_id does not match the daily plan');
      }
    }
    const updated = await this.sessionsRepository.update(id, {
      categoryId: dto.category_id,
      displayMs: dto.display_ms,
      audioMode: dto.audio_mode,
      status: dto.status,
      mode: dto.mode,
    });
    if (!updated) {
      throw new NotFoundException('Doman session not found');
    }
    return updated;
  }

  async addToDailyPlan(
    dailyPlanId: string,
    dto: AddDomanSessionsDto,
    requester: DomanRequester,
  ): Promise<DomanSession[]> {
    assertCanManageDoman(requester);
    const plan = await this.requireDailyPlan(dailyPlanId);
    const existing = await this.sessionsRepository.findByDailyPlanId(
      dailyPlanId,
    );
    const count = dto.count ?? 1;
    if (existing.length + count > 10) {
      throw new BadRequestException(
        'A daily plan cannot contain more than 10 sessions',
      );
    }

    const templateSession = existing[0];
    const templateCards = templateSession
      ? await this.sessionCardsRepository.listBySessionId(templateSession.id)
      : [];
    const configuredCardIds =
      templateCards.length === 0
        ? await this.resolveStudyPlanCardIds(plan)
        : null;
    const fallbackCards =
      templateCards.length === 0 && configuredCardIds === null
        ? await this.wordCardsRepository.listByStudentCategoryAndStatuses(
            plan.student_id,
            plan.category_id,
            ['new', 'active', 'completed'],
          )
        : [];
    const wordCardIds =
      templateCards.length > 0
        ? templateCards.map((card) => card.word_card_id)
        : configuredCardIds !== null
          ? configuredCardIds
          : fallbackCards
            .slice(0, plan.target_cards_count)
            .map((card) => card.id);
    if (wordCardIds.length === 0) {
      throw new BadRequestException(
        'No word cards are available for the new session',
      );
    }

    const usedIndexes = new Set(
      existing.map((session) => session.session_index),
    );
    const availableIndexes = Array.from({ length: 10 }, (_, index) => index + 1)
      .filter((index) => !usedIndexes.has(index));
    for (let offset = 0; offset < count; offset += 1) {
      const sessionIndex = availableIndexes[offset];
      const session = await this.sessionsRepository.create({
        studentId: plan.student_id,
        dailyPlanId: plan.id,
        sessionIndex,
        categoryId: plan.category_id,
        displayMs: dto.display_ms ?? templateSession?.display_ms ?? 2200,
        audioMode: dto.audio_mode ?? templateSession?.audio_mode ?? 'manual',
        status: 'planned',
        mode: dto.mode ?? templateSession?.mode ?? 'auto',
      });
      await this.sessionCardsRepository.createMany(
        wordCardIds.map((wordCardId, orderIndex) => ({
          sessionId: session.id,
          wordCardId,
          orderIndex,
        })),
      );
    }
    const sessions = await this.sessionsRepository.findByDailyPlanId(plan.id);
    await this.dailyPlansRepository.update(plan.id, {
      targetSessionsCount: sessions.length,
    });
    return sessions;
  }

  async restore(
    id: string,
    requester: DomanRequester,
  ): Promise<DomanSession> {
    assertCanManageDoman(requester);
    await this.requireSession(id);
    await this.sessionCardsRepository.resetBySessionIds([id]);
    await this.sessionsRepository.restoreByIds([id]);
    const restored = await this.sessionsRepository.findById(id);
    if (!restored) {
      throw new NotFoundException('Doman session not found');
    }
    return restored;
  }

  async restoreDailyPlan(
    dailyPlanId: string,
    requester: DomanRequester,
  ): Promise<DomanSession[]> {
    assertCanManageDoman(requester);
    await this.requireDailyPlan(dailyPlanId);
    const sessions = await this.sessionsRepository.findByDailyPlanId(
      dailyPlanId,
    );
    const ids = sessions.map((session) => session.id);
    await this.sessionCardsRepository.resetBySessionIds(ids);
    await this.sessionsRepository.restoreByIds(ids);
    return this.sessionsRepository.findByDailyPlanId(dailyPlanId);
  }

  async delete(
    id: string,
    requester: DomanRequester,
  ): Promise<void> {
    assertCanManageDoman(requester);
    const session = await this.requireSession(id);
    await this.exposureLogsRepository.deleteBySessionIds([id]);
    await this.sessionCardsRepository.deleteBySessionIds([id]);
    await this.sessionsRepository.deleteById(id);
    const remaining = await this.sessionsRepository.findByDailyPlanId(
      session.daily_plan_id,
    );
    if (remaining.length > 0) {
      await this.dailyPlansRepository.update(session.daily_plan_id, {
        targetSessionsCount: remaining.length,
      });
    }
  }

  async deleteDailyPlanSessions(
    dailyPlanId: string,
    requester: DomanRequester,
  ): Promise<void> {
    assertCanManageDoman(requester);
    await this.requireDailyPlan(dailyPlanId);
    const sessions = await this.sessionsRepository.findByDailyPlanId(
      dailyPlanId,
    );
    const ids = sessions.map((session) => session.id);
    await this.exposureLogsRepository.deleteBySessionIds(ids);
    await this.sessionCardsRepository.deleteBySessionIds(ids);
    await this.sessionsRepository.deleteByDailyPlanId(dailyPlanId);
  }

  private async requireDailyPlan(id: string) {
    const plan = await this.dailyPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    return plan;
  }

  private async resolveDefaultCategoryId(studentId: string): Promise<string | null> {
    const counts = await this.wordCardsRepository.countWordCardsByCategoryForStudent(studentId);
    return selectDefaultCategoryId(counts);
  }

  private async resolveStudyPlanCardIds(
    plan: DomanDailyPlan,
  ): Promise<string[] | null> {
    if (!plan.study_plan_id || !plan.study_plan_level_id) {
      return null;
    }
    const studyPlan = await this.studyPlansRepository.findById(
      plan.study_plan_id,
    );
    const level = studyPlan?.levels.find(
      (candidate) => candidate.id === plan.study_plan_level_id,
    );
    const category = level?.categories.find(
      (candidate) => candidate.category_id === plan.category_id,
    );
    if (!category) {
      return null;
    }
    const cards = await this.wordCardsRepository.findByIds(
      category.word_card_ids,
    );
    return cards
      .filter(
        (card) =>
          card.student_id === plan.student_id &&
          card.category_id === plan.category_id &&
          card.status !== 'archived',
      )
      .map((card) => card.id);
  }

  private async toDetailedSession(session: DomanSession): Promise<unknown> {
    const cards = await this.sessionCardsRepository.listBySessionId(session.id);
    return {
      session_id: session.id,
      student_id: session.student_id,
      plan_id: session.daily_plan_id,
      category_id: session.category_id,
      session_index: session.session_index,
      status: session.status,
      display_ms: session.display_ms,
      audio_mode: session.audio_mode,
      mode: session.mode ?? 'auto',
      started_at: session.started_at,
      completed_at: session.completed_at,
      cards: cards.map((card) => ({
        id: card.word_card_id,
        order_index: card.order_index,
        displayed_at: card.displayed_at,
        audio_played_at: card.audio_played_at,
        word: card.word_card?.word,
        status: card.word_card?.status,
        audio_url: card.word_card?.audio_url,
        category_id: card.word_card?.category_id,
        learning_unit_id: card.word_card?.learning_unit_id,
      })),
    };
  }
}
