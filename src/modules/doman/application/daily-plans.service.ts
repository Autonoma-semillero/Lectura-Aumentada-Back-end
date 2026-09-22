import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import {
  initialLetterFromNormalizedWord,
  normalizeWordForStorage,
} from '../../../common/utils/word-normalize';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import {
  DEFAULT_DAILY_PLAN_TARGET_CARDS,
  DEFAULT_DAILY_PLAN_TARGET_SESSIONS,
  DEFAULT_DOMAN_DISPLAY_MS,
  MAX_DAILY_PLAN_TARGET_CARDS,
  MAX_DAILY_PLAN_TARGET_SESSIONS,
  MAX_DOMAN_DISPLAY_MS,
  MIN_DAILY_PLAN_TARGET_CARDS,
  MIN_DAILY_PLAN_TARGET_SESSIONS,
  MIN_DOMAN_DISPLAY_MS,
} from '../domain/constants/doman-limits.constants';
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
import type { DomanSessionCardSnapshot } from '../domain/interfaces/doman-session-card.interface';
import { IDomanSessionCardsRepository } from '../domain/interfaces/doman-session-cards.repository.interface';
import type { DomanSession } from '../domain/interfaces/doman-session.interface';
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
import {
  normalizeDomanWord,
  resolveEligibleDomanCards,
  resolveStudyPlanCategoryCards,
  resolveWordsForStudent,
} from './word-card-selection.util';

@Injectable()
export class DailyPlansService {
  private readonly logger = new Logger(DailyPlansService.name);

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
      studyContext?.plan.id,
    );
    if (existing) {
      const sessions = await this.sessionsRepository.findByDailyPlanId(
        existing.id,
      );
      const cards = await this.resolvePersistedCards(sessions);
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
    let targetCardsCount = this.clamp(
      dto.target_cards_count ??
        studyContext?.category.target_cards_count ??
        DEFAULT_DAILY_PLAN_TARGET_CARDS,
      MIN_DAILY_PLAN_TARGET_CARDS,
      MAX_DAILY_PLAN_TARGET_CARDS,
    );
    const targetSessionsCount = this.clamp(
      dto.target_sessions_count ??
        studyContext?.plan.sessions_per_day ??
        DEFAULT_DAILY_PLAN_TARGET_SESSIONS,
      MIN_DAILY_PLAN_TARGET_SESSIONS,
      MAX_DAILY_PLAN_TARGET_SESSIONS,
    );
    const displayMs = this.clamp(
      dto.display_ms ??
        studyContext?.plan.display_ms ??
        DEFAULT_DOMAN_DISPLAY_MS,
      MIN_DOMAN_DISPLAY_MS,
      MAX_DOMAN_DISPLAY_MS,
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

    const existing = await this.dailyPlansRepository.findByStudentAndPlanDate(
      dto.student_id,
      planDate,
      categoryId,
      studyContext?.plan.id,
    );
    let existingSessions: DomanSession[] = [];
    if (existing) {
      existingSessions = await this.sessionsRepository.findByDailyPlanId(
        existing.id,
      );
      if (!force) {
        const persistedCards =
          await this.resolvePersistedCards(existingSessions);
        return {
          status: 'existing',
          plan: this.toSummary(existing, existingSessions, persistedCards),
        };
      }
      if (
        existingSessions.some((session) => session.status === 'completed')
      ) {
        throw new ConflictException(
          'Cannot regenerate a daily plan with completed sessions',
        );
      }
    }

    const selectedCards = studyContext
      ? await this.resolveConfiguredCards(studyContext.category, dto.student_id)
      : await this.resolveCards(dto.student_id, categoryId, targetCardsCount);
    if (selectedCards.length === 0) {
      throw new BadRequestException(
        'No available word cards to generate the daily plan',
      );
    }
    targetCardsCount = selectedCards.length;

    let plan: DomanDailyPlan;
    // Compensación a ejecutar si la generación falla después de haber tocado
    // la base. Mongo no da transacciones multi-documento acá, así que cada
    // rama declara explícitamente cómo se deshace.
    let compensate: () => Promise<void>;
    if (!existing) {
      plan = await this.dailyPlansRepository.create({
        studentId: dto.student_id,
        planDateUtcMidnight: planDate,
        targetCardsCount: selectedCards.length,
        targetSessionsCount,
        categoryId,
        studyPlanId: studyContext?.plan.id,
        studyPlanLevelId: studyContext?.level.id,
        algorithmVersion: studyContext
          ? this.studyPlanAlgorithmVersion(studyContext.plan)
          : 'doman-mvp-v1',
        notes: studyContext
          ? `Generated from study plan: ${studyContext.plan.name}`
          : 'Auto-generated daily plan',
      });
      const createdPlanId = plan.id;
      compensate = () => this.cleanupFailedNewPlan(createdPlanId);
    } else {
      // Capturar lo que la regeneración está por destruir ANTES de borrarlo:
      // sin este snapshot una falla al recrear las sesiones deja el plan sin
      // sesiones y sin forma de recuperar las originales.
      const snapshotPlan = existing;
      const snapshotSessions = existingSessions;
      const snapshotCards = await this.snapshotSessionCards(snapshotSessions);
      compensate = () =>
        this.restoreRegeneratedPlan(
          snapshotPlan,
          snapshotSessions,
          snapshotCards,
        );

      try {
        await this.sessionCardsRepository.deleteBySessionIds(
          snapshotSessions.map((session) => session.id),
        );
        await this.sessionsRepository.deleteByDailyPlanId(existing.id);
        const updated = await this.dailyPlansRepository.update(existing.id, {
          targetCardsCount: selectedCards.length,
          targetSessionsCount,
          categoryId,
          studyPlanId: studyContext?.plan.id,
          studyPlanLevelId: studyContext?.level.id,
          algorithmVersion: studyContext
            ? this.studyPlanAlgorithmVersion(studyContext.plan)
            : 'doman-mvp-v1',
          notes: force ? 'Regenerated daily plan' : 'Generated daily plan',
        });
        if (!updated) {
          throw new NotFoundException('Daily plan not found');
        }
        plan = updated;
      } catch (error) {
        await compensate();
        throw error;
      }
    }

    let sessions: DomanSession[];
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
      await compensate();
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
    await this.purgeSessionsForPlan(id);
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
  ): Promise<DomanSession[]> {
    const sessions: DomanSession[] = [];

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
      sessions.push(session);
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
    try {
      await this.purgeSessionsForPlan(planId);
      await this.dailyPlansRepository.delete(planId);
    } catch (cleanupError) {
      // Nunca enmascarar el error original de la generación.
      this.logger.error(
        `Failed to clean up daily plan ${planId} after a failed generation`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
    }
  }

  private async purgeSessionsForPlan(planId: string): Promise<void> {
    const sessions = await this.sessionsRepository.findByDailyPlanId(planId);
    if (sessions.length > 0) {
      await this.sessionCardsRepository.deleteBySessionIds(
        sessions.map((session) => session.id),
      );
      await this.sessionsRepository.deleteByDailyPlanId(planId);
    }
  }

  private async snapshotSessionCards(
    sessions: DomanSession[],
  ): Promise<DomanSessionCardSnapshot[]> {
    const snapshots: DomanSessionCardSnapshot[] = [];
    for (const session of sessions) {
      const cards = await this.sessionCardsRepository.listBySessionId(
        session.id,
      );
      for (const card of cards) {
        const { word_card: _expandedWordCard, ...row } = card;
        snapshots.push(row);
      }
    }
    return snapshots;
  }

  /**
   * Deshace una regeneración fallida: descarta lo que quedó a medio crear y
   * reinserta el plan, las sesiones y las filas puente originales.
   */
  private async restoreRegeneratedPlan(
    plan: DomanDailyPlan,
    sessions: DomanSession[],
    cards: DomanSessionCardSnapshot[],
  ): Promise<void> {
    try {
      await this.purgeSessionsForPlan(plan.id);
      await this.sessionsRepository.restoreMany(sessions);
      await this.sessionCardsRepository.restoreMany(cards);
      await this.dailyPlansRepository.restore(plan);
    } catch (restoreError) {
      // Nunca enmascarar el error original de la generación: el cliente debe
      // ver por qué falló, y el operador necesita saber que quedó a medias.
      this.logger.error(
        `Failed to restore daily plan ${plan.id} after a failed regeneration; ` +
          `${sessions.length} session(s) and ${cards.length} session card(s) may be missing`,
        restoreError instanceof Error ? restoreError.stack : undefined,
      );
    }
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

  private resolveCards(
    studentId: string,
    categoryId: string,
    limit: number,
  ): Promise<WordCardListed[]> {
    return resolveEligibleDomanCards(
      this.wordCardsRepository,
      studentId,
      categoryId,
      limit,
    );
  }

  private async resolvePersistedCards(
    sessions: Array<{ id: string; session_index: number }>,
  ): Promise<WordCardListed[]> {
    const orderedSessions = [...sessions].sort(
      (left, right) => left.session_index - right.session_index,
    );
    for (const session of orderedSessions) {
      const sessionCards =
        await this.sessionCardsRepository.listBySessionId(session.id);
      const cards = sessionCards
        .map((sessionCard) => sessionCard.word_card)
        .filter((card): card is WordCardListed => card !== undefined);
      if (cards.length > 0) {
        return cards;
      }
    }
    return [];
  }

  private async resolveConfiguredCards(
    category: DomanStudyPlanCategory,
    studentId: string,
  ): Promise<WordCardListed[]> {
    if (category.word_card_words !== undefined) {
      const initialResolution = await resolveWordsForStudent(
        this.wordCardsRepository,
        category.word_card_words,
        studentId,
        category.category_id,
      );
      if (initialResolution.unresolvedWords.length === 0) {
        return initialResolution.cards;
      }

      const categoryTemplates =
        await this.wordCardsRepository.listByCategoryId(category.category_id);
      const templatesByWord = new Map(
        categoryTemplates.map((card) => [normalizeDomanWord(card.word), card]),
      );
      for (const rawWord of initialResolution.unresolvedWords) {
        const word = normalizeWordForStorage(rawWord);
        if (!word) {
          continue;
        }
        const template = templatesByWord.get(normalizeDomanWord(word));
        try {
          await this.wordCardsRepository.create({
            studentId,
            word,
            initialLetter: initialLetterFromNormalizedWord(word),
            audioUrl: template?.audio_url,
            categoryId: category.category_id,
            status: 'new',
            language: template?.language,
            learningUnitId: template?.learning_unit_id,
          });
        } catch (error) {
          if (!(error instanceof MongoServerError && error.code === 11000)) {
            throw error;
          }
        }
      }

      const finalResolution = await resolveWordsForStudent(
        this.wordCardsRepository,
        category.word_card_words,
        studentId,
        category.category_id,
      );
      return finalResolution.cards;
    }
    return resolveStudyPlanCategoryCards(
      this.wordCardsRepository,
      category,
      studentId,
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
      !plan.student_ids.some((candidate) =>
        isSameObjectId(candidate, studentId),
      ) ||
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
    // El repositorio devuelve los ObjectId en minúsculas (`toHexString`) pero
    // `@IsMongoId()` acepta hex en mayúsculas: comparar con `===` produce un
    // 404 falso sobre una categoría que sí está configurada.
    const category = categoryId
      ? level.categories.find((candidate) =>
          isSameObjectId(candidate.category_id, categoryId),
        )
      : level.categories[0];
    if (!category) {
      throw new NotFoundException(
        'The category is not configured for the active study plan level',
      );
    }
    return { plan, level, category };
  }

  private studyPlanAlgorithmVersion(plan: DomanStudyPlan): string {
    return plan.schema_version >= 2
      ? 'doman-study-plan-v2'
      : 'doman-study-plan-v1';
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
      // Siempre el tamaño real de `cards`. Caer a `target_cards_count` cuando
      // la lista viene vacía hacía que la respuesta dijera `cards_count: 5`
      // junto a `cards: []`; quien necesite la intención guardada la tiene en
      // `plan.target_cards_count`, que viaja en esta misma respuesta.
      cards_count: cards.length,
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
