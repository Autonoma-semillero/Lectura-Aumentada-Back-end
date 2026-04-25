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
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { DomanSession } from '../domain/interfaces/doman-session.interface';
import { IDailyPlansRepository } from '../domain/interfaces/daily-plans.repository.interface';
import { IDomanSessionsRepository } from '../domain/interfaces/doman-sessions.repository.interface';
import { CreateDomanSessionDto } from '../dto/create-doman-session.dto';
import { ListDomanSessionsQueryDto } from '../dto/list-doman-sessions-query.dto';
import { UpdateDomanSessionDto } from '../dto/update-doman-session.dto';

@Injectable()
export class DomanSessionsService {
  constructor(
    @Inject(DOMAN_SESSIONS_REPOSITORY)
    private readonly sessionsRepository: IDomanSessionsRepository,
    @Inject(DAILY_PLANS_REPOSITORY)
    private readonly dailyPlansRepository: IDailyPlansRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(query: ListDomanSessionsQueryDto): Promise<DomanSession[]> {
    if (!Types.ObjectId.isValid(query.daily_plan_id)) {
      throw new BadRequestException('Invalid daily_plan_id');
    }
    return this.sessionsRepository.findByDailyPlanId(query.daily_plan_id);
  }

  async getById(id: string): Promise<DomanSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session id');
    }
    const s = await this.sessionsRepository.findById(id);
    if (!s) {
      throw new NotFoundException('Doman session not found');
    }
    return s;
  }

  async create(dto: CreateDomanSessionDto): Promise<DomanSession> {
    await this.categoriesService.findById(dto.category_id);
    const plan = await this.dailyPlansRepository.findById(dto.daily_plan_id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    if (plan.student_id !== dto.student_id) {
      throw new BadRequestException('student_id does not match the daily plan');
    }
    if (dto.category_id !== plan.category_id) {
      throw new BadRequestException(
        'category_id must match the daily plan category_id (same criterion as word cards)',
      );
    }
    const status = dto.status ?? 'planned';
    try {
      return await this.sessionsRepository.create({
        studentId: dto.student_id,
        dailyPlanId: dto.daily_plan_id,
        sessionIndex: dto.session_index,
        categoryId: dto.category_id,
        displayMs: dto.display_ms,
        audioMode: dto.audio_mode,
        status,
        mode: dto.mode,
      });
    } catch (e) {
      this.rethrowDuplicateSessionIndex(e);
      throw e;
    }
  }

  async update(id: string, dto: UpdateDomanSessionDto): Promise<DomanSession> {
    const session = await this.getById(id);
    const plan = await this.dailyPlansRepository.findById(session.daily_plan_id);
    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }
    const touched =
      dto.category_id !== undefined ||
      dto.display_ms !== undefined ||
      dto.audio_mode !== undefined ||
      dto.status !== undefined ||
      dto.mode !== undefined;
    if (!touched) {
      throw new BadRequestException('At least one field to update is required');
    }
    if (dto.category_id !== undefined) {
      await this.categoriesService.findById(dto.category_id);
      if (dto.category_id !== plan.category_id) {
        throw new BadRequestException(
          'category_id must match the daily plan category_id (same criterion as word cards)',
        );
      }
    }
    try {
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
    } catch (e) {
      this.rethrowDuplicateSessionIndex(e);
      throw e;
    }
  }

  private rethrowDuplicateSessionIndex(err: unknown): void {
    if (
      err instanceof MongoServerError &&
      (err.code === 11000 || err.code === 11001)
    ) {
      throw new ConflictException(
        'A session with this index already exists for this daily plan',
      );
    }
  }
}
