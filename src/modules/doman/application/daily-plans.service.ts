import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
  STUDY_PLANS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { IDailyPlansRepository } from '../domain/interfaces/daily-plans.repository.interface';
import { DomanDailyPlan } from '../domain/interfaces/doman-daily-plan.interface';
import {
  DomanDailyPlanGeneration,
  DomanDailyPlanSummary,
} from '../domain/interfaces/doman-daily-plan-summary.interface';
import type {
  DomanStudyPlan,
  DomanStudyPlanCategory,
  DomanStudyPlanLevel,
} from '../domain/interfaces/doman-study-plan.interface';
import { IDomanSessionCardsRepository } from '../domain/interfaces/doman-session-cards.repository.interface';
import { IDomanSessionsRepository } from '../domain/interfaces/doman-sessions.repository.interface';
import type { IStudyPlansRepository } from '../domain/interfaces/study-plans.repository.interface';
import { DomanRequester } from '../domain/types/doman-requester.type';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { ListDailyPlansQueryDto } from '../dto/list-daily-plans-query.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';
import { selectDefaultCategoryId } from './default-category.util';
import {
  assertCanAccessStudent,
  assertCanManageDoman,
  isSameObjectId,
} from './doman-authorization.util';
import {
  planDateToUtcMidnight,
  todayPlanDateUtcMidnight,
} from './plan-date.util';

@Injectable()
export class DailyPlansService {
  constructor(
    @Inject(DAILY_PLANS_REPOSITORY)
    private readonly dailyPlansRepository: IDailyPlansRepository,
    @Inject(DOMAN_SESSIONS_REPOSITORY)
    private readonly sessionsRepository: IDomanSessionsRepository,
    @Inject(DOMAN_SESSION_CARDS_REPOSITORY)
    private readonly sessionCardsRepository: IDomanSessionCardsRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
    @Inject(STUDY_PLANS_REPOSITORY)
    private readonly studyPlansRepository: IStudyPlansRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(
    query: ListDailyPlansQueryDto,
    requester: DomanRequester,
  ): Promise<DomanDailyPlan[]> {
    if (!isMongoObjectId(query.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, query.student_id);
    const to = query.to
      ? planDateToUtcMidnight(query.to)
      : todayPlanDateUtcMidnight();
    const from = query.from
      ? planDateToUtcMidnight(query.from)
      : new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be <= to');
    }
    return this.dailyPlansRepository.findByStudentAndDateRange(
      query.student_id,
      from,
      to,
    );
  }

  async getById(
    id: string,
    requester: DomanRequester,
  ): Promise<DomanDailyPlan> {
    const plan = await this.requirePlan(id);
    assertCanAccessStudent(requester, plan.student_id);
    return plan;
  }

  private async requirePlan(id: string): Promise<DomanDailyPlan> {
    if (!isMongoObjectId(id)) {
      throw new BadRequestException('Invalid daily plan id');
    }
    const plan = await this.dailyPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    return plan;
  }

  async getToday(
    studentId: string,
    categoryId: string | undefined,
    requester: DomanRequester,
  ): Promise<DomanDailyPlanSummary> {
    if (!isMongoObjectId(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, studentId);
    if (categoryId !== undefined && !isMongoObjectId(categoryId)) {
      throw new BadRequestException('Invalid category_id');
    }
    const today = todayPlanDateUtcMidnight();
    const studyContext = await this.resolveStudyPlanContext(
      studentId,
      today,
      undefined,
      categoryId,
    );
    const resolvedCategoryId =
      categoryId ??
      studyContext?.category.category_id ??
      (await this.resolveDefaultCategoryId(studentId));
    if (!resolvedCategoryId) {
      throw new BadRequestException(
        'No available category to generate a daily plan',
      );
    }
    const existing = await this.dailyPlansRepository.findByStudentAndPlanDate(
      studentId,
      today,
      resolvedCategoryId,
    );
    if (existing) {
      const sessions = await this.sessionsRepository.findByDailyPlanId(
        existing.id,
      );
      const cards = studyContext
        ? await this.resolveConfiguredCards(
            studyContext.category,
            existing.student_id,
          )
        : await this.resolveCards(
            existing.student_id,
            existing.category_id,
            existing.target_cards_count,
          );
      return this.toSummary(existing, sessions, cards);
    }
    return this.generatePlan({
      student_id: studentId,
      category_id: resolvedCategoryId,
    });
  }

  async generate(
    dto: GenerateDailyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanDailyPlanSummary> {
    if (!isMongoObjectId(dto.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    assertCanAccessStudent(requester, dto.student_id);
    return this.generatePlan(dto);
  }

  async generateForAssignment(
    dto: GenerateDailyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanDailyPlanGeneration> {
    assertCanManageDoman(requester);
    if (!isMongoObjectId(dto.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    return this.generatePlanWithStatus(dto);
  }

  private async generatePlan(
    dto: GenerateDailyPlanDto,
  ): Promise<DomanDailyPlanSummary> {
    return (await this.generatePlanWithStatus(dto)).plan;
  }

  private async generatePlanWithStatus(
    dto: GenerateDailyPlanDto,
  ): Promise<DomanDailyPlanGeneration> {
    try {
      return await this.generatePlanOnce(dto);
    } catch (error) {
      this.rethrowDuplicateGeneration(error);
      throw error;
    }
  }

  private async generatePlanOnce(
    dto: GenerateDailyPlanDto,
  ): Promise<DomanDailyPlanGeneration> {
    if (!isMongoObjectId(dto.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    const planDate = dto.plan_date
      ? planDateToUtcMidnight(dto.plan_date)
      : todayPlanDateUtcMidnight();
    const studyContext = await this.resolveStudyPlanContext(
      dto.student_id,
      planDate,
      dto.study_plan_id,
      dto.category_id,
    );
    let targetCardsCount = this.clamp(dto.target_cards_count ?? 5, 1, 50);
    const targetSessionsCount = this.clamp(
      dto.target_sessions_count ?? studyContext?.plan.sessions_per_day ?? 5,
      1,
      10,
    );
    const displayMs = this.clamp(
      dto.display_ms ?? studyContext?.plan.display_ms ?? 2200,
      200,
      10000,
    );
    const force = dto.force ?? false;

    const categoryId =
      dto.category_id ??
      studyContext?.category.category_id ??
      (await this.resolveDefaultCategoryId(dto.student_id));
    if (!categoryId) {
      throw new BadRequestException(
        'No available category to generate a daily plan',
      );
    }
    await this.categoriesService.findById(categoryId);

    const selectedCards = studyContext
      ? await this.resolveConfiguredCards(studyContext.category, dto.student_id)
      : await this.resolveCards(dto.student_id, categoryId, targetCardsCount);
    if (selectedCards.length === 0) {
      throw new BadRequestException(
        'No available word cards to generate the daily plan',
      );
    }
    targetCardsCount = selectedCards.length;

    const existing = await this.dailyPlansRepository.findByStudentAndPlanDate(
      dto.student_id,
      planDate,
      categoryId,
    );

    let plan: DomanDailyPlan;
    let createdNewPlan = false;
    if (!existing) {
      plan = await this.dailyPlansRepository.create({
        studentId: dto.student_id,
        planDateUtcMidnight: planDate,
        targetCardsCount: selectedCards.length,
        targetSessionsCount,
        categoryId,
        studyPlanId: studyContext?.plan.id,
        studyPlanLevelId: studyContext?.level.id,
        algorithmVersion: studyContext ? 'doman-study-plan-v1' : 'doman-mvp-v1',
        notes: studyContext
          ? `Generated from study plan: ${studyContext.plan.name}`
          : 'Auto-generated daily plan',
      });
      createdNewPlan = true;
    } else {
      const existingSessions = await this.sessionsRepository.findByDailyPlanId(
        existing.id,
      );
      if (!force) {
        return {
          status: 'existing',
          plan: this.toSummary(existing, existingSessions, selectedCards),
        };
      }
      if (
        force &&
        existingSessions.some((session) => session.status === 'completed')
      ) {
        throw new ConflictException(
          'Cannot regenerate a daily plan with completed sessions',
        );
      }
      await this.sessionCardsRepository.deleteBySessionIds(
        existingSessions.map((session) => session.id),
      );
      await this.sessionsRepository.deleteByDailyPlanId(existing.id);
      const updated = await this.dailyPlansRepository.update(existing.id, {
        targetCardsCount: selectedCards.length,
        targetSessionsCount,
        categoryId,
        studyPlanId: studyContext?.plan.id,
        studyPlanLevelId: studyContext?.level.id,
        algorithmVersion: studyContext ? 'doman-study-plan-v1' : 'doman-mvp-v1',
        notes: force ? 'Regenerated daily plan' : 'Generated daily plan',
      });
      if (!updated) {
        throw new NotFoundException('Daily plan not found');
      }
      plan = updated;
    }

    let sessions: Array<{
      id: string;
      status: string;
      session_index: number;
    }>;
    try {
      sessions = await this.createSessionsForPlan(
        plan,
        selectedCards,
        targetSessionsCount,
        displayMs,
        studyContext?.plan.audio_mode ?? 'manual',
        studyContext?.plan.mode ?? 'auto',
      );
    } catch (error) {
      if (createdNewPlan) {
        await this.cleanupFailedNewPlan(plan.id);
      }
      throw error;
    }
    return {
      status: 'generated',
      plan: this.toSummary(plan, sessions, selectedCards),
    };
  }

  async delete(id: string, requester: DomanRequester): Promise<void> {
    assertCanManageDoman(requester);
    await this.requirePlan(id);
    const sessions = await this.sessionsRepository.findByDailyPlanId(id);
    if (sessions.length > 0) {
      await this.sessionCardsRepository.deleteBySessionIds(
        sessions.map((s) => s.id),
      );
      await this.sessionsRepository.deleteByDailyPlanId(id);
    }
    await this.dailyPlansRepository.delete(id);
  }

  async create(
    dto: CreateDailyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanDailyPlan> {
    assertCanManageDoman(requester);
    await this.categoriesService.findById(dto.category_id);
    const planDateUtcMidnight = planDateToUtcMidnight(dto.plan_date);
    try {
      return await this.dailyPlansRepository.create({
        studentId: dto.student_id,
        planDateUtcMidnight,
        targetCardsCount: dto.target_cards_count,
        targetSessionsCount: dto.target_sessions_count,
        categoryId: dto.category_id,
        algorithmVersion: dto.algorithm_version?.trim(),
        notes: dto.notes?.trim(),
      });
    } catch (error) {
      this.rethrowDuplicateStudentPlanDate(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateDailyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanDailyPlan> {
    assertCanManageDoman(requester);
    const existing = await this.requirePlan(id);
    const touched =
      dto.target_cards_count !== undefined ||
      dto.target_sessions_count !== undefined ||
      dto.category_id !== undefined ||
      dto.algorithm_version !== undefined ||
      dto.notes !== undefined;
    if (!touched) {
      throw new BadRequestException('At least one field to update is required');
    }
    if (dto.category_id !== undefined) {
      await this.categoriesService.findById(dto.category_id);
      if (!isSameObjectId(dto.category_id, existing.category_id)) {
        const sessions = await this.sessionsRepository.findByDailyPlanId(id);
        if (sessions.length > 0) {
          throw new ConflictException(
            'Cannot change the category of a daily plan that already has sessions',
          );
        }
      }
    }
    try {
      const updated = await this.dailyPlansRepository.update(id, {
        targetCardsCount: dto.target_cards_count,
        targetSessionsCount: dto.target_sessions_count,
        categoryId: dto.category_id,
        algorithmVersion:
          dto.algorithm_version !== undefined
            ? dto.algorithm_version.trim()
            : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() : undefined,
      });
      if (!updated) {
        throw new NotFoundException('Daily plan not found');
      }
      return updated;
    } catch (error) {
      this.rethrowDuplicateStudentPlanDate(error);
      throw error;
    }
  }

  private async createSessionsForPlan(
    plan: DomanDailyPlan,
    cards: WordCardListed[],
    targetSessionsCount: number,
    displayMs: number,
    audioMode: 'auto' | 'manual' | 'disabled' = 'manual',
    mode: 'manual' | 'auto' = 'auto',
  ) {
    const sessions: Array<{
      id: string;
      status: string;
      session_index: number;
    }> = [];

    for (
      let sessionIndex = 1;
      sessionIndex <= targetSessionsCount;
      sessionIndex += 1
    ) {
      const session = await this.sessionsRepository.create({
        studentId: plan.student_id,
        dailyPlanId: plan.id,
        sessionIndex,
        categoryId: plan.category_id,
        displayMs,
        audioMode,
        status: 'planned',
        mode,
      });
      sessions.push({
        id: session.id,
        status: session.status,
        session_index: session.session_index,
      });
      await this.sessionCardsRepository.createMany(
        cards.map((card, orderIndex) => ({
          sessionId: session.id,
          wordCardId: card.id,
          orderIndex,
        })),
      );
    }

    return sessions;
  }

  private async cleanupFailedNewPlan(planId: string): Promise<void> {
    const sessions = await this.sessionsRepository.findByDailyPlanId(planId);
    if (sessions.length > 0) {
      await this.sessionCardsRepository.deleteBySessionIds(
        sessions.map((session) => session.id),
      );
      await this.sessionsRepository.deleteByDailyPlanId(planId);
    }
    await this.dailyPlansRepository.delete(planId);
  }

  private async resolveDefaultCategoryId(
    studentId: string,
  ): Promise<string | null> {
    const counts =
      await this.wordCardsRepository.countWordCardsByCategoryForStudent(
        studentId,
      );
    return selectDefaultCategoryId(counts);
  }

  private async resolveCards(
    studentId: string,
    categoryId: string,
    limit: number,
  ): Promise<WordCardListed[]> {
    const primary =
      await this.wordCardsRepository.listByStudentCategoryAndStatuses(
        studentId,
        categoryId,
        ['new', 'active'],
      );
    let candidateCards = primary;
    if (candidateCards.length < limit) {
      const fallback =
        await this.wordCardsRepository.listByStudentCategoryAndStatuses(
          studentId,
          categoryId,
          ['completed'],
        );
      candidateCards = candidateCards.concat(fallback);
    }
    return sortCardsByPriority(candidateCards).slice(0, limit);
  }

  private async resolveConfiguredCards(
    category: DomanStudyPlanCategory,
    studentId: string,
  ): Promise<WordCardListed[]> {
    const cards = await this.wordCardsRepository.findByIds(
      category.word_card_ids,
    );
    return cards.filter(
      (card) =>
        card.student_id === studentId &&
        card.category_id === category.category_id &&
        card.status !== 'archived',
    );
  }

  private async resolveStudyPlanContext(
    studentId: string,
    planDate: Date,
    studyPlanId?: string,
    categoryId?: string,
  ): Promise<{
    plan: DomanStudyPlan;
    level: DomanStudyPlanLevel;
    category: DomanStudyPlanCategory;
  } | null> {
    const plan = studyPlanId
      ? await this.studyPlansRepository.findById(studyPlanId)
      : await this.studyPlansRepository.findActiveForStudentAndDate(
          studentId,
          planDate,
        );
    if (!plan) {
      if (studyPlanId) {
        throw new NotFoundException('Study plan not found');
      }
      return null;
    }
    if (
      plan.student_id !== studentId ||
      plan.status !== 'active' ||
      planDate < plan.start_date ||
      planDate > plan.end_date
    ) {
      throw new ConflictException(
        'Study plan is not active for this student and date',
      );
    }
    const level = plan.levels.find(
      (candidate) =>
        candidate.start_date <= planDate && candidate.end_date >= planDate,
    );
    if (!level) {
      throw new NotFoundException(
        'No study plan level is scheduled for this date',
      );
    }
    const category = categoryId
      ? level.categories.find(
          (candidate) => candidate.category_id === categoryId,
        )
      : level.categories[0];
    if (!category) {
      throw new NotFoundException(
        'The category is not configured for the active study plan level',
      );
    }
    return { plan, level, category };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  private toSummary(
    plan: DomanDailyPlan,
    sessions: Array<{ id: string; status: string; session_index: number }> = [],
    cards: WordCardListed[] = [],
  ): DomanDailyPlanSummary {
    return {
      plan,
      cards_count: cards.length || plan.target_cards_count,
      cards: cards.map((card) => ({
        id: card.id,
        word: card.word,
        status: card.status,
        audio_url: card.audio_url,
      })),
      sessions_count: sessions.length,
      completed_sessions_count: sessions.filter(
        (session) => session.status === 'completed',
      ).length,
      pending_sessions_count: sessions.filter(
        (session) =>
          session.status === 'planned' || session.status === 'in_progress',
      ).length,
      next_session_id:
        sessions.find((session) => session.status === 'in_progress')?.id ??
        sessions.find((session) => session.status === 'planned')?.id ??
        null,
    };
  }

  private rethrowDuplicateStudentPlanDate(error: unknown): void {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictException(
        'A daily plan already exists for this student, plan_date and category_id',
      );
    }
  }

  private rethrowDuplicateGeneration(error: unknown): void {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictException(
        'The daily plan or its sessions were generated concurrently',
      );
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      error instanceof MongoServerError &&
      (error.code === 11000 || error.code === 11001)
    );
  }
}

const statusPriority = new Map<string, number>([
  ['new', 0],
  ['active', 1],
  ['completed', 2],
  ['archived', 3],
]);

function sortCardsByPriority(cards: WordCardListed[]): WordCardListed[] {
  return [...cards].sort((left, right) => {
    const byStatus =
      (statusPriority.get(left.status) ?? 99) -
      (statusPriority.get(right.status) ?? 99);
    if (byStatus !== 0) {
      return byStatus;
    }
    if (left.times_shown !== right.times_shown) {
      return left.times_shown - right.times_shown;
    }
    return left.word.localeCompare(right.word, 'es');
  });
}
