import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import type { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import type { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import { GroupsService } from '../../groups/application/groups.service';
import type { GroupsRequester } from '../../groups/domain/types/groups-requester.type';
import {
  MAX_DOMAN_BULK_AUDIENCE_SIZE,
  MAX_DOMAN_STUDY_PLAN_DAY_JOBS,
  MAX_DOMAN_STUDY_PLAN_DAY_SESSION_CARDS,
} from '../domain/constants/doman-limits.constants';
import { STUDY_PLANS_REPOSITORY } from '../domain/constants/doman.tokens';
import type {
  DomanStudyPlan,
  DomanStudyPlanCategory,
  DomanStudyPlanLevel,
} from '../domain/interfaces/doman-study-plan.interface';
import type { IStudyPlansRepository } from '../domain/interfaces/study-plans.repository.interface';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import {
  CreateStudyPlanDto,
  StudyPlanLevelDto,
} from '../dto/create-study-plan.dto';
import { GenerateStudyPlanDayDto } from '../dto/generate-study-plan-day.dto';
import { GetActiveStudyPlanQueryDto } from '../dto/get-active-study-plan-query.dto';
import { ListStudyPlansQueryDto } from '../dto/list-study-plans-query.dto';
import { UpdateStudyPlanDto } from '../dto/update-study-plan.dto';
import {
  assertCanAccessStudent,
  assertCanManageDoman,
  isSameObjectId,
} from './doman-authorization.util';
import { DailyPlansService } from './daily-plans.service';
import {
  planDateToUtcMidnight,
  todayPlanDateUtcMidnight,
} from './plan-date.util';

type StudyPlanDayResult = {
  student_id: string;
  category_id: string;
  status: 'generated' | 'existing' | 'failed';
  plan?: Awaited<
    ReturnType<DailyPlansService['generateForAssignment']>
  >['plan'];
  error?: string;
};

type StudyPlanDayResponse = {
  summary: {
    total: number;
    generated: number;
    existing: number;
    failed: number;
  };
  results: StudyPlanDayResult[];
};

@Injectable()
export class StudyPlansService {
  constructor(
    @Inject(STUDY_PLANS_REPOSITORY)
    private readonly studyPlansRepository: IStudyPlansRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly groupsService: GroupsService,
    private readonly dailyPlansService: DailyPlansService,
  ) {}

  async list(
    query: ListStudyPlansQueryDto,
    requester: DomanRequester,
  ): Promise<DomanStudyPlan[]> {
    assertCanManageDoman(requester);
    return this.studyPlansRepository.findAll({
      studentId: query.student_id,
      status: query.status,
      createdBy: requester.role === 'admin' ? undefined : requester.userId,
    });
  }

  async getById(
    id: string,
    requester: DomanRequester,
  ): Promise<DomanStudyPlan> {
    assertCanManageDoman(requester);
    return this.requireManagedPlan(id, requester);
  }

  async getActiveConfiguration(
    query: GetActiveStudyPlanQueryDto,
    requester: DomanRequester,
  ): Promise<unknown> {
    assertCanAccessStudent(requester, query.student_id);
    const date = query.date
      ? planDateToUtcMidnight(query.date)
      : todayPlanDateUtcMidnight();
    const plan = await this.studyPlansRepository.findActiveForStudentAndDate(
      query.student_id,
      date,
    );
    if (!plan) {
      return { plan_id: null, level_id: null, categories: [] };
    }
    const level = this.findLevelForDate(plan, date);
    if (!level) {
      return {
        plan_id: plan.id,
        plan_name: plan.name,
        level_id: null,
        categories: [],
      };
    }
    const categories = await Promise.all(
      level.categories.map(async (selection) => {
        const [category, availableCards] = await Promise.all([
          this.categoriesService.findById(selection.category_id),
          this.resolveConfiguredCards(selection, query.student_id),
        ]);
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          available_word_cards_count: availableCards.length,
        };
      }),
    );
    return {
      plan_id: plan.id,
      plan_name: plan.name,
      level_id: level.id,
      level_name: level.name,
      date: date.toISOString().slice(0, 10),
      categories,
    };
  }

  async create(
    dto: CreateStudyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanStudyPlan> {
    assertCanManageDoman(requester);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name must not be empty');
    }
    const groupIds = [
      ...new Set((dto.group_ids ?? []).map((id) => id.toLowerCase())),
    ];
    const directStudentIds = [
      ...new Set(
        [
          ...(dto.student_ids ?? []),
          ...(dto.student_id ? [dto.student_id] : []),
        ].map((id) => id.toLowerCase()),
      ),
    ];
    if (groupIds.length === 0 && directStudentIds.length === 0) {
      throw new BadRequestException(
        'At least one group_id, student_id or student_ids value is required',
      );
    }
    const groupsRequester: GroupsRequester = {
      userId: requester.userId,
      role: requester.role === 'admin' ? 'admin' : 'teacher',
    };
    const audience = await this.groupsService.resolveAudience(
      groupIds,
      directStudentIds,
      groupsRequester,
    );
    if (audience.student_ids.length === 0) {
      throw new BadRequestException('The selected audience has no students');
    }
    if (audience.student_ids.length > MAX_DOMAN_BULK_AUDIENCE_SIZE) {
      throw new BadRequestException(
        `The resolved audience cannot exceed ${MAX_DOMAN_BULK_AUDIENCE_SIZE} students`,
      );
    }

    const startDate = planDateToUtcMidnight(dto.start_date);
    const endDate = planDateToUtcMidnight(dto.end_date);
    this.assertDateRange(startDate, endDate);
    const legacyExactStudentId =
      groupIds.length === 0 &&
      (dto.student_ids?.length ?? 0) === 0 &&
      dto.student_id
        ? dto.student_id
        : undefined;
    const levels = await this.buildAndValidateLevels(
      dto.levels,
      startDate,
      endDate,
      legacyExactStudentId,
    );
    const sessionsPerDay = dto.sessions_per_day ?? 5;
    this.assertGenerationWorkload(
      audience.student_ids.length,
      sessionsPerDay,
      levels,
    );
    const status = dto.status ?? 'active';
    await this.assertNoActiveOverlap(
      audience.student_ids,
      startDate,
      endDate,
      status,
    );

    return this.studyPlansRepository.create({
      name,
      description: dto.description?.trim(),
      groupIds,
      directStudentIds,
      students: audience.students,
      startDate,
      endDate,
      sessionsPerDay,
      displayMs: dto.display_ms ?? 2200,
      audioMode: dto.audio_mode ?? 'manual',
      mode: dto.mode ?? 'auto',
      status,
      levels,
      createdBy: requester.userId,
    });
  }

  async update(
    id: string,
    dto: UpdateStudyPlanDto,
    requester: DomanRequester,
  ): Promise<DomanStudyPlan> {
    assertCanManageDoman(requester);
    const existing = await this.requireManagedPlan(id, requester);
    if (dto.group_ids !== undefined || dto.student_ids !== undefined) {
      throw new BadRequestException(
        'Study plan audience is immutable and cannot be changed by PATCH',
      );
    }
    if (
      dto.student_id !== undefined &&
      !(
        existing.student_ids.length === 1 &&
        isSameObjectId(existing.student_ids[0], dto.student_id)
      )
    ) {
      throw new BadRequestException(
        'Study plan audience is immutable and cannot be changed by PATCH',
      );
    }
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('name must not be empty');
    }
    const startDate = dto.start_date
      ? planDateToUtcMidnight(dto.start_date)
      : existing.start_date;
    const endDate = dto.end_date
      ? planDateToUtcMidnight(dto.end_date)
      : existing.end_date;
    this.assertDateRange(startDate, endDate);
    const legacyExactStudentId = this.hasLegacyExactSelections(existing)
      ? existing.student_ids[0]
      : undefined;
    const levels = dto.levels
      ? await this.buildAndValidateLevels(
          dto.levels,
          startDate,
          endDate,
          legacyExactStudentId,
        )
      : existing.levels;
    this.assertLevelsInsidePlan(levels, startDate, endDate);
    const sessionsPerDay = dto.sessions_per_day ?? existing.sessions_per_day;
    this.assertGenerationWorkload(
      existing.student_ids.length,
      sessionsPerDay,
      levels,
    );
    const status = dto.status ?? existing.status;
    await this.assertNoActiveOverlap(
      existing.student_ids,
      startDate,
      endDate,
      status,
      id,
    );

    const updated = await this.studyPlansRepository.update(id, {
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      startDate: dto.start_date ? startDate : undefined,
      endDate: dto.end_date ? endDate : undefined,
      sessionsPerDay: dto.sessions_per_day,
      displayMs: dto.display_ms,
      audioMode: dto.audio_mode,
      mode: dto.mode,
      status: dto.status,
      levels: dto.levels ? levels : undefined,
    });
    if (!updated) {
      throw new NotFoundException('Study plan not found');
    }
    return updated;
  }

  async archive(id: string, requester: DomanRequester): Promise<void> {
    assertCanManageDoman(requester);
    await this.requireManagedPlan(id, requester);
    await this.studyPlansRepository.update(id, { status: 'archived' });
  }

  async generateDay(
    id: string,
    dto: GenerateStudyPlanDayDto,
    requester: DomanRequester,
  ): Promise<StudyPlanDayResponse> {
    assertCanManageDoman(requester);
    const plan = await this.requireManagedPlan(id, requester);
    if (plan.status !== 'active') {
      throw new ConflictException(
        'Only active study plans can generate sessions',
      );
    }
    const date = dto.date
      ? planDateToUtcMidnight(dto.date)
      : todayPlanDateUtcMidnight();
    if (date < plan.start_date || date > plan.end_date) {
      throw new BadRequestException('date must be inside the study plan range');
    }
    const level = this.findLevelForDate(plan, date);
    if (!level) {
      throw new NotFoundException(
        'No study plan level is scheduled for this date',
      );
    }
    this.assertGenerationWorkload(
      plan.student_ids.length,
      plan.sessions_per_day,
      [level],
    );

    const jobs = plan.student_ids.flatMap((studentId) =>
      level.categories.map((category) => ({ studentId, category })),
    );
    const results = new Array<StudyPlanDayResult>(jobs.length);
    let nextIndex = 0;
    const workers = Array.from(
      { length: Math.min(5, jobs.length) },
      async () => {
        while (nextIndex < jobs.length) {
          const index = nextIndex;
          nextIndex += 1;
          const job = jobs[index];
          try {
            const generated =
              await this.dailyPlansService.generateForAssignment(
                {
                  student_id: job.studentId,
                  study_plan_id: plan.id,
                  category_id: job.category.category_id,
                  plan_date: date.toISOString().slice(0, 10),
                  target_cards_count: job.category.target_cards_count,
                  force: dto.force ?? false,
                },
                requester,
              );
            results[index] = {
              student_id: job.studentId,
              category_id: job.category.category_id,
              status: generated.status,
              plan: generated.plan,
            };
          } catch (error) {
            results[index] = {
              student_id: job.studentId,
              category_id: job.category.category_id,
              status: 'failed',
              error: this.toPublicError(error),
            };
          }
        }
      },
    );
    await Promise.all(workers);
    return {
      summary: {
        total: results.length,
        generated: results.filter((result) => result.status === 'generated')
          .length,
        existing: results.filter((result) => result.status === 'existing')
          .length,
        failed: results.filter((result) => result.status === 'failed').length,
      },
      results,
    };
  }

  private async requirePlan(id: string): Promise<DomanStudyPlan> {
    const plan = await this.studyPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Study plan not found');
    }
    return plan;
  }

  private async requireManagedPlan(
    id: string,
    requester: DomanRequester,
  ): Promise<DomanStudyPlan> {
    const plan = await this.requirePlan(id);
    if (
      requester.role !== 'admin' &&
      !isSameObjectId(plan.created_by, requester.userId)
    ) {
      throw new ForbiddenException('You cannot manage this study plan');
    }
    return plan;
  }

  private async buildAndValidateLevels(
    levelDtos: StudyPlanLevelDto[],
    planStart: Date,
    planEnd: Date,
    legacyExactStudentId?: string,
  ): Promise<DomanStudyPlanLevel[]> {
    const levels = levelDtos
      .map((level) => ({
        id: level.id ?? randomBytes(12).toString('hex'),
        name: level.name.trim(),
        order_index: level.order_index,
        start_date: planDateToUtcMidnight(level.start_date),
        end_date: planDateToUtcMidnight(level.end_date),
        categories: level.categories.map((category) => {
          if (
            category.word_card_ids !== undefined &&
            category.target_cards_count !== undefined
          ) {
            throw new BadRequestException(
              'A study plan category cannot define both target_cards_count and word_card_ids',
            );
          }
          if (category.word_card_ids !== undefined) {
            if (!legacyExactStudentId) {
              throw new BadRequestException(
                'word_card_ids is only supported by the deprecated singleton audience; use target_cards_count for audience plans',
              );
            }
            return {
              category_id: category.category_id,
              word_card_ids: [...category.word_card_ids],
            };
          }
          return {
            category_id: category.category_id,
            target_cards_count: category.target_cards_count ?? 5,
          };
        }),
      }))
      .sort((left, right) => left.order_index - right.order_index);

    if (
      new Set(levels.map((level) => level.order_index)).size !== levels.length
    ) {
      throw new BadRequestException('Level order_index values must be unique');
    }
    if (new Set(levels.map((level) => level.id)).size !== levels.length) {
      throw new BadRequestException('Level id values must be unique');
    }

    this.assertLevelsInsidePlan(levels, planStart, planEnd);

    for (const [index, level] of levels.entries()) {
      if (!level.name) {
        throw new BadRequestException('Level name must not be empty');
      }
      if (index > 0 && level.start_date <= levels[index - 1].end_date) {
        throw new BadRequestException('Study plan levels cannot overlap');
      }
      const categoryIds = level.categories.map(
        (category) => category.category_id,
      );
      if (new Set(categoryIds).size !== categoryIds.length) {
        throw new BadRequestException(
          'A category cannot repeat inside a level',
        );
      }
      for (const category of level.categories) {
        await this.categoriesService.findById(category.category_id);
        if (category.target_cards_count !== undefined) {
          if (
            !Number.isInteger(category.target_cards_count) ||
            category.target_cards_count < 1 ||
            category.target_cards_count > 50
          ) {
            throw new BadRequestException(
              'target_cards_count must be an integer between 1 and 50',
            );
          }
          continue;
        }
        const wordCardIds = category.word_card_ids ?? [];
        const cards = await this.wordCardsRepository.findByIds(wordCardIds);
        if (cards.length !== wordCardIds.length) {
          throw new BadRequestException(
            'One or more selected word cards do not exist',
          );
        }
        if (
          cards.some(
            (card) =>
              !legacyExactStudentId ||
              !isSameObjectId(card.student_id, legacyExactStudentId) ||
              !isSameObjectId(card.category_id ?? '', category.category_id) ||
              card.status === 'archived',
          )
        ) {
          throw new BadRequestException(
            'Selected cards must belong to the plan student and category',
          );
        }
      }
    }
    return levels;
  }

  private assertLevelsInsidePlan(
    levels: DomanStudyPlanLevel[],
    planStart: Date,
    planEnd: Date,
  ): void {
    for (const level of levels) {
      this.assertDateRange(level.start_date, level.end_date);
      if (level.start_date < planStart || level.end_date > planEnd) {
        throw new BadRequestException(
          'Level dates must be inside the study plan range',
        );
      }
    }
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new BadRequestException('start_date must be <= end_date');
    }
  }

  private assertGenerationWorkload(
    studentCount: number,
    sessionsPerDay: number,
    levels: DomanStudyPlanLevel[],
  ): void {
    for (const level of levels) {
      const jobs = studentCount * level.categories.length;
      if (jobs > MAX_DOMAN_STUDY_PLAN_DAY_JOBS) {
        throw new BadRequestException(
          `A study plan day cannot exceed ${MAX_DOMAN_STUDY_PLAN_DAY_JOBS} student-category jobs`,
        );
      }
      const cardsPerStudent = level.categories.reduce(
        (total, category) =>
          total +
          (category.target_cards_count ?? category.word_card_ids?.length ?? 5),
        0,
      );
      const estimatedSessionCards =
        studentCount * sessionsPerDay * cardsPerStudent;
      if (
        estimatedSessionCards > MAX_DOMAN_STUDY_PLAN_DAY_SESSION_CARDS
      ) {
        throw new BadRequestException(
          `A study plan day cannot exceed ${MAX_DOMAN_STUDY_PLAN_DAY_SESSION_CARDS} estimated session-card assignments`,
        );
      }
    }
  }

  private async assertNoActiveOverlap(
    studentIds: string[],
    startDate: Date,
    endDate: Date,
    status: DomanStudyPlan['status'],
    excludeId?: string,
  ): Promise<void> {
    if (status !== 'active') {
      return;
    }
    const overlapping = await this.studyPlansRepository.findOverlappingActive(
      studentIds,
      startDate,
      endDate,
      excludeId,
    );
    if (overlapping) {
      throw new ConflictException(
        'At least one student already has an active study plan in this date range',
      );
    }
  }

  private findLevelForDate(
    plan: DomanStudyPlan,
    date: Date,
  ): DomanStudyPlanLevel | undefined {
    return plan.levels.find(
      (level) => level.start_date <= date && level.end_date >= date,
    );
  }

  private hasLegacyExactSelections(plan: DomanStudyPlan): boolean {
    return (
      plan.student_ids.length === 1 &&
      plan.levels.some((level) =>
        level.categories.some(
          (category) => category.word_card_ids !== undefined,
        ),
      )
    );
  }

  private async resolveConfiguredCards(
    category: DomanStudyPlanCategory,
    studentId: string,
  ): Promise<WordCardListed[]> {
    if (category.word_card_ids !== undefined) {
      const cards = await this.wordCardsRepository.findByIds(
        category.word_card_ids,
      );
      return cards.filter(
        (card) =>
          isSameObjectId(card.student_id, studentId) &&
          isSameObjectId(card.category_id ?? '', category.category_id) &&
          card.status !== 'archived',
      );
    }
    const limit = category.target_cards_count ?? 5;
    const primary =
      await this.wordCardsRepository.listByStudentCategoryAndStatuses(
        studentId,
        category.category_id,
        ['new', 'active'],
      );
    let candidates = primary;
    if (candidates.length < limit) {
      const completed =
        await this.wordCardsRepository.listByStudentCategoryAndStatuses(
          studentId,
          category.category_id,
          ['completed'],
        );
      candidates = candidates.concat(completed);
    }
    return candidates.slice(0, limit);
  }

  private toPublicError(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response.slice(0, 500);
      }
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (response as { message?: unknown }).message;
        if (typeof message === 'string') {
          return message.slice(0, 500);
        }
        if (Array.isArray(message)) {
          return message
            .filter((value): value is string => typeof value === 'string')
            .join(', ')
            .slice(0, 500);
        }
      }
    }
    return 'The daily plan could not be generated for this student';
  }
}
