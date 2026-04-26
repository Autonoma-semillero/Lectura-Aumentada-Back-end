import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { Types } from 'mongoose';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { IDailyPlansRepository } from '../domain/interfaces/daily-plans.repository.interface';
import { DomanDailyPlan } from '../domain/interfaces/doman-daily-plan.interface';
import { IDomanSessionCardsRepository } from '../domain/interfaces/doman-session-cards.repository.interface';
import { IDomanSessionsRepository } from '../domain/interfaces/doman-sessions.repository.interface';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { ListDailyPlansQueryDto } from '../dto/list-daily-plans-query.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';
import { planDateToUtcMidnight } from './plan-date.util';

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
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(query: ListDailyPlansQueryDto): Promise<DomanDailyPlan[]> {
    if (!Types.ObjectId.isValid(query.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    const to = query.to
      ? planDateToUtcMidnight(query.to)
      : planDateToUtcMidnight(new Date().toISOString().slice(0, 10));
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

  async getById(id: string): Promise<DomanDailyPlan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid daily plan id');
    }
    const plan = await this.dailyPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    return plan;
  }

  async getToday(studentId: string): Promise<unknown> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    const today = planDateToUtcMidnight(new Date().toISOString().slice(0, 10));
    const existing = await this.dailyPlansRepository.findByStudentAndPlanDate(
      studentId,
      today,
    );
    if (existing) {
      const sessions = await this.sessionsRepository.findByDailyPlanId(existing.id);
      const cards = await this.resolveCards(
        existing.student_id,
        existing.category_id,
        existing.target_cards_count,
      );
      return this.toSummary(existing, sessions, cards);
    }
    return this.generate({ student_id: studentId });
  }

  async generate(dto: GenerateDailyPlanDto): Promise<unknown> {
    if (!Types.ObjectId.isValid(dto.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    const today = planDateToUtcMidnight(new Date().toISOString().slice(0, 10));
    const targetCardsCount = this.clamp(dto.target_cards_count ?? 5, 3, 8);
    const targetSessionsCount = this.clamp(dto.target_sessions_count ?? 3, 1, 5);
    const displayMs = this.clamp(dto.display_ms ?? 2200, 800, 6000);
    const force = dto.force ?? false;

    const categoryId = dto.category_id ?? (await this.resolveDefaultCategoryId(dto.student_id));
    if (!categoryId) {
      throw new BadRequestException('No available category to generate a daily plan');
    }
    await this.categoriesService.findById(categoryId);

    const selectedCards = await this.resolveCards(
      dto.student_id,
      categoryId,
      targetCardsCount,
    );
    if (selectedCards.length === 0) {
      throw new BadRequestException('No available word cards to generate the daily plan');
    }

    const existing = await this.dailyPlansRepository.findByStudentAndPlanDate(
      dto.student_id,
      today,
      categoryId,
    );

    let plan: DomanDailyPlan;
    if (!existing) {
      plan = await this.dailyPlansRepository.create({
        studentId: dto.student_id,
        planDateUtcMidnight: today,
        targetCardsCount: selectedCards.length,
        targetSessionsCount,
        categoryId,
        algorithmVersion: 'doman-mvp-v1',
        notes: 'Auto-generated daily plan',
      });
    } else {
      const existingSessions = await this.sessionsRepository.findByDailyPlanId(existing.id);
      if (!force && existingSessions.length > 0) {
        return this.toSummary(existing, existingSessions, selectedCards);
      }
      if (force && existingSessions.some((session) => session.status === 'completed')) {
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
        algorithmVersion: 'doman-mvp-v1',
        notes: force ? 'Regenerated daily plan' : 'Generated daily plan',
      });
      if (!updated) {
        throw new NotFoundException('Daily plan not found');
      }
      plan = updated;
    }

    const sessions = await this.createSessionsForPlan(
      plan,
      selectedCards,
      targetSessionsCount,
      displayMs,
    );
    return this.toSummary(plan, sessions, selectedCards);
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid daily plan id');
    }
    const plan = await this.dailyPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    const sessions = await this.sessionsRepository.findByDailyPlanId(id);
    if (sessions.length > 0) {
      await this.sessionCardsRepository.deleteBySessionIds(sessions.map((s) => s.id));
      await this.sessionsRepository.deleteByDailyPlanId(id);
    }
    await this.dailyPlansRepository.delete(id);
  }

  async create(dto: CreateDailyPlanDto): Promise<DomanDailyPlan> {
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

  async update(id: string, dto: UpdateDailyPlanDto): Promise<DomanDailyPlan> {
    await this.getById(id);
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
  ) {
    const sessions: Array<{
      id: string;
      status: string;
      session_index: number;
    }> = [];

    for (let sessionIndex = 1; sessionIndex <= targetSessionsCount; sessionIndex += 1) {
      const session = await this.sessionsRepository.create({
        studentId: plan.student_id,
        dailyPlanId: plan.id,
        sessionIndex,
        categoryId: plan.category_id,
        displayMs,
        audioMode: 'manual',
        status: 'planned',
        mode: 'auto',
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

  private async resolveDefaultCategoryId(studentId: string): Promise<string | null> {
    const counts = await this.wordCardsRepository.countWordCardsByCategoryForStudent(studentId);
    return counts[0]?.categoryId ?? null;
  }

  private async resolveCards(
    studentId: string,
    categoryId: string,
    limit: number,
  ): Promise<WordCardListed[]> {
    const primary = await this.wordCardsRepository.listByStudentCategoryAndStatuses(
      studentId,
      categoryId,
      ['new', 'active'],
    );
    let candidateCards = primary;
    if (candidateCards.length < limit) {
      const fallback = await this.wordCardsRepository.listByStudentCategoryAndStatuses(
        studentId,
        categoryId,
        ['completed'],
      );
      candidateCards = candidateCards.concat(fallback);
    }
    return sortCardsByPriority(candidateCards).slice(0, limit);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  private toSummary(
    plan: DomanDailyPlan,
    sessions: Array<{ id: string; status: string; session_index: number }> = [],
    cards: WordCardListed[] = [],
  ) {
    return {
      plan,
      cards_count: cards.length || plan.target_cards_count,
      cards: cards.map((card) => ({
        id: card.id,
        word: card.word,
        status: card.status,
        audio_url: card.audio_url,
      })),
      sessions_count: sessions.length || plan.target_sessions_count,
      completed_sessions_count: sessions.filter((session) => session.status === 'completed').length,
      pending_sessions_count: sessions.filter(
        (session) => session.status === 'planned' || session.status === 'in_progress',
      ).length,
      next_session_id:
        sessions.find((session) => session.status === 'in_progress')?.id ??
        sessions.find((session) => session.status === 'planned')?.id ??
        null,
    };
  }

  private rethrowDuplicateStudentPlanDate(error: unknown): void {
    if (
      error instanceof MongoServerError &&
      (error.code === 11000 || error.code === 11001)
    ) {
      throw new ConflictException(
        'A daily plan already exists for this student, plan_date and category',
      );
    }
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
