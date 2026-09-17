import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import type { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import { STUDY_PLANS_REPOSITORY } from '../domain/constants/doman.tokens';
import type {
  DomanStudyPlan,
  DomanStudyPlanLevel,
} from '../domain/interfaces/doman-study-plan.interface';
import type { IStudyPlansRepository } from '../domain/interfaces/study-plans.repository.interface';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import {
  CreateStudyPlanDto,
  StudyPlanLevelDto,
} from '../dto/create-study-plan.dto';
import { GenerateStudyPlanDayDto } from '../dto/generate-study-plan-day.dto';
import { ListStudyPlansQueryDto } from '../dto/list-study-plans-query.dto';
import { UpdateStudyPlanDto } from '../dto/update-study-plan.dto';
import { GetActiveStudyPlanQueryDto } from '../dto/get-active-study-plan-query.dto';
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

@Injectable()
export class StudyPlansService {
  constructor(
    @Inject(STUDY_PLANS_REPOSITORY)
    private readonly studyPlansRepository: IStudyPlansRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
    private readonly categoriesService: CategoriesService,
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
        const category = await this.categoriesService.findById(
          selection.category_id,
        );
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          available_word_cards_count: selection.word_card_ids.length,
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
    const startDate = planDateToUtcMidnight(dto.start_date);
    const endDate = planDateToUtcMidnight(dto.end_date);
    this.assertDateRange(startDate, endDate);
    const levels = await this.buildAndValidateLevels(
      dto.levels,
      dto.student_id,
      startDate,
      endDate,
    );
    const status = dto.status ?? 'active';
    await this.assertNoActiveOverlap(
      dto.student_id,
      startDate,
      endDate,
      status,
    );

    return this.studyPlansRepository.create({
      name,
      description: dto.description?.trim(),
      studentId: dto.student_id,
      startDate,
      endDate,
      sessionsPerDay: dto.sessions_per_day ?? 5,
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
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('name must not be empty');
    }
    const studentId = dto.student_id ?? existing.student_id;
    const startDate = dto.start_date
      ? planDateToUtcMidnight(dto.start_date)
      : existing.start_date;
    const endDate = dto.end_date
      ? planDateToUtcMidnight(dto.end_date)
      : existing.end_date;
    this.assertDateRange(startDate, endDate);
    if (
      dto.student_id &&
      dto.student_id !== existing.student_id &&
      !dto.levels
    ) {
      throw new BadRequestException(
        'levels are required when changing the study plan student',
      );
    }
    const levels = dto.levels
      ? await this.buildAndValidateLevels(
          dto.levels,
          studentId,
          startDate,
          endDate,
        )
      : existing.levels;
    this.assertLevelsInsidePlan(levels, startDate, endDate);
    const status = dto.status ?? existing.status;
    await this.assertNoActiveOverlap(studentId, startDate, endDate, status, id);

    const updated = await this.studyPlansRepository.update(id, {
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      studentId: dto.student_id,
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
  ): Promise<unknown[]> {
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

    const summaries: unknown[] = [];
    for (const category of level.categories) {
      summaries.push(
        await this.dailyPlansService.generate(
          {
            student_id: plan.student_id,
            study_plan_id: plan.id,
            category_id: category.category_id,
            plan_date: date.toISOString().slice(0, 10),
            force: dto.force ?? false,
          },
          requester,
        ),
      );
    }
    return summaries;
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
    studentId: string,
    planStart: Date,
    planEnd: Date,
  ): Promise<DomanStudyPlanLevel[]> {
    const levels = levelDtos
      .map((level) => ({
        id: level.id ?? randomBytes(12).toString('hex'),
        name: level.name.trim(),
        order_index: level.order_index,
        start_date: planDateToUtcMidnight(level.start_date),
        end_date: planDateToUtcMidnight(level.end_date),
        categories: level.categories.map((category) => ({
          category_id: category.category_id,
          word_card_ids: [...category.word_card_ids],
        })),
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
        const cards = await this.wordCardsRepository.findByIds(
          category.word_card_ids,
        );
        if (cards.length !== category.word_card_ids.length) {
          throw new BadRequestException(
            'One or more selected word cards do not exist',
          );
        }
        if (
          cards.some(
            (card) =>
              card.student_id !== studentId ||
              card.category_id !== category.category_id ||
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

  private async assertNoActiveOverlap(
    studentId: string,
    startDate: Date,
    endDate: Date,
    status: DomanStudyPlan['status'],
    excludeId?: string,
  ): Promise<void> {
    if (status !== 'active') {
      return;
    }
    const overlapping = await this.studyPlansRepository.findOverlappingActive(
      studentId,
      startDate,
      endDate,
      excludeId,
    );
    if (overlapping) {
      throw new ConflictException(
        'The student already has an active study plan in this date range',
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
}
