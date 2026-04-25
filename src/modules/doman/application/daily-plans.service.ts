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
import { DAILY_PLANS_REPOSITORY } from '../domain/constants/doman.tokens';
import { DomanDailyPlan } from '../domain/interfaces/doman-daily-plan.interface';
import { IDailyPlansRepository } from '../domain/interfaces/daily-plans.repository.interface';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { ListDailyPlansQueryDto } from '../dto/list-daily-plans-query.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';
import { planDateToUtcMidnight } from './plan-date.util';

@Injectable()
export class DailyPlansService {
  constructor(
    @Inject(DAILY_PLANS_REPOSITORY)
    private readonly dailyPlansRepository: IDailyPlansRepository,
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
    const p = await this.dailyPlansRepository.findById(id);
    if (!p) {
      throw new NotFoundException('Daily plan not found');
    }
    return p;
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
    } catch (e) {
      this.rethrowDuplicateStudentPlanDate(e);
      throw e;
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
    } catch (e) {
      this.rethrowDuplicateStudentPlanDate(e);
      throw e;
    }
  }

  private rethrowDuplicateStudentPlanDate(err: unknown): void {
    if (
      err instanceof MongoServerError &&
      (err.code === 11000 || err.code === 11001)
    ) {
      throw new ConflictException(
        'A daily plan already exists for this student and plan_date',
      );
    }
  }
}
