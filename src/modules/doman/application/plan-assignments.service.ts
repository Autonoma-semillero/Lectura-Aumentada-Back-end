import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { GroupsService } from '../../groups/application/groups.service';
import type { GroupsRequester } from '../../groups/domain/types/groups-requester.type';
import { PLAN_ASSIGNMENTS_REPOSITORY } from '../domain/constants/doman.tokens';
import { MAX_DOMAN_BULK_AUDIENCE_SIZE } from '../domain/constants/doman-limits.constants';
import {
  DomanPlanAssignment,
  DomanPlanAssignmentResult,
  DomanPlanAssignmentStatus,
  DomanPlanAssignmentSummary,
} from '../domain/interfaces/doman-plan-assignment.interface';
import { IPlanAssignmentsRepository } from '../domain/interfaces/plan-assignments.repository.interface';
import { DomanRequester } from '../domain/types/doman-requester.type';
import { BulkGenerateDailyPlansDto } from '../dto/bulk-generate-daily-plans.dto';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { ListPlanAssignmentsQueryDto } from '../dto/list-plan-assignments-query.dto';
import {
  assertCanManageDoman,
  isSameObjectId,
} from './doman-authorization.util';
import { DailyPlansService } from './daily-plans.service';
import {
  planDateToUtcMidnight,
  todayPlanDateUtcMidnight,
} from './plan-date.util';

type RuntimeAssignmentResult = DomanPlanAssignmentResult & {
  plan?: Awaited<
    ReturnType<DailyPlansService['generateForAssignment']>
  >['plan'];
};

@Injectable()
export class PlanAssignmentsService {
  constructor(
    @Inject(PLAN_ASSIGNMENTS_REPOSITORY)
    private readonly assignmentsRepository: IPlanAssignmentsRepository,
    private readonly groupsService: GroupsService,
    private readonly dailyPlansService: DailyPlansService,
  ) {}

  async generate(
    dto: BulkGenerateDailyPlansDto,
    requester: DomanRequester,
  ): Promise<unknown> {
    assertCanManageDoman(requester);
    if (dto.force === true) {
      throw new BadRequestException(
        'force=true is not supported for bulk plan generation',
      );
    }
    const groupsRequester: GroupsRequester = {
      userId: requester.userId,
      role: requester.role === 'admin' ? 'admin' : 'teacher',
    };
    const groupIds = dto.group_ids ?? [];
    const directStudentIds = dto.student_ids ?? [];
    if (groupIds.length === 0 && directStudentIds.length === 0) {
      throw new BadRequestException(
        'At least one group_id or student_id is required',
      );
    }

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

    const planDate = dto.plan_date
      ? planDateToUtcMidnight(dto.plan_date)
      : todayPlanDateUtcMidnight();
    const assignment = await this.assignmentsRepository.create({
      groupIds,
      directStudentIds,
      students: audience.students,
      categoryId: dto.category_id,
      planDate,
      targetCardsCount: dto.target_cards_count,
      targetSessionsCount: dto.target_sessions_count,
      displayMs: dto.display_ms,
      force: dto.force ?? false,
      createdBy: requester.userId,
    });

    const results = await this.generateForStudents(
      audience.students,
      dto,
      requester,
    );
    const summary = this.summarize(results);
    const status = this.resolveStatus(summary);
    const persistedResults = results.map(
      ({ plan: _plan, ...result }) => result,
    );
    const completed = await this.assignmentsRepository.complete(assignment.id, {
      status,
      summary,
      results: persistedResults,
    });
    if (!completed) {
      throw new InternalServerErrorException(
        'The plan assignment could not be finalized',
      );
    }

    return {
      assignment: completed,
      audience,
      summary,
      results,
    };
  }

  async list(
    query: ListPlanAssignmentsQueryDto,
    requester: DomanRequester,
  ): Promise<DomanPlanAssignment[]> {
    assertCanManageDoman(requester);
    return this.assignmentsRepository.list({
      createdBy: requester.role === 'admin' ? undefined : requester.userId,
      status: query.status,
      limit: query.limit ?? 30,
    });
  }

  async getById(
    id: string,
    requester: DomanRequester,
  ): Promise<DomanPlanAssignment> {
    assertCanManageDoman(requester);
    if (!isMongoObjectId(id)) {
      throw new BadRequestException('Invalid plan assignment id');
    }
    const assignment = await this.assignmentsRepository.findById(id);
    if (!assignment) {
      throw new NotFoundException('Plan assignment not found');
    }
    if (
      requester.role !== 'admin' &&
      !isSameObjectId(assignment.created_by, requester.userId)
    ) {
      throw new ForbiddenException('You cannot access this plan assignment');
    }
    return assignment;
  }

  private async generateForStudents(
    students: Awaited<ReturnType<GroupsService['resolveAudience']>>['students'],
    dto: BulkGenerateDailyPlansDto,
    requester: DomanRequester,
  ): Promise<RuntimeAssignmentResult[]> {
    const results = new Array<RuntimeAssignmentResult>(students.length);
    let nextIndex = 0;
    const workers = Array.from(
      { length: Math.min(5, students.length) },
      async () => {
        while (nextIndex < students.length) {
          const index = nextIndex;
          nextIndex += 1;
          const student = students[index];
          const generationDto: GenerateDailyPlanDto = {
            student_id: student.student_id,
            category_id: dto.category_id,
            plan_date: dto.plan_date,
            target_cards_count: dto.target_cards_count,
            target_sessions_count: dto.target_sessions_count,
            display_ms: dto.display_ms,
            force: dto.force,
          };
          try {
            const generated =
              await this.dailyPlansService.generateForAssignment(
                generationDto,
                requester,
              );
            results[index] = {
              student_id: student.student_id,
              status: generated.status,
              plan_id: generated.plan.plan.id,
              plan: generated.plan,
              sources: student.sources,
            };
          } catch (error) {
            results[index] = {
              student_id: student.student_id,
              status: 'failed',
              error: this.toPublicError(error),
              sources: student.sources,
            };
          }
        }
      },
    );
    await Promise.all(workers);
    return results;
  }

  private summarize(
    results: RuntimeAssignmentResult[],
  ): DomanPlanAssignmentSummary {
    return {
      total: results.length,
      generated: results.filter((result) => result.status === 'generated')
        .length,
      existing: results.filter((result) => result.status === 'existing').length,
      failed: results.filter((result) => result.status === 'failed').length,
    };
  }

  private resolveStatus(
    summary: DomanPlanAssignmentSummary,
  ): Exclude<DomanPlanAssignmentStatus, 'processing'> {
    if (summary.failed === 0) {
      return 'completed';
    }
    if (summary.failed === summary.total) {
      return 'failed';
    }
    return 'partial';
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
