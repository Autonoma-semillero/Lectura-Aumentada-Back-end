import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { DailyPlansService } from '../application/daily-plans.service';
import { PlanAssignmentsService } from '../application/plan-assignments.service';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import { BulkGenerateDailyPlansDto } from '../dto/bulk-generate-daily-plans.dto';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { ListDailyPlansQueryDto } from '../dto/list-daily-plans-query.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';

@ApiTags('doman-daily-plans')
@Controller('doman/daily-plans')
export class DailyPlansController {
  constructor(
    private readonly dailyPlansService: DailyPlansService,
    private readonly planAssignmentsService: PlanAssignmentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDailyPlanDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.create(dto, this.toRequester(req));
  }

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher', 'admin')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body() dto: GenerateDailyPlanDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.generate(dto, this.toRequester(req));
  }

  @Post('bulk-generate')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.OK)
  async bulkGenerate(
    @Body() dto: BulkGenerateDailyPlansDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.planAssignmentsService.generate(dto, this.toRequester(req));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher', 'admin')
  async list(
    @Query() query: ListDailyPlansQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.list(query, this.toRequester(req));
  }

  @Get('today')
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher', 'admin')
  async today(
    @Query() query: StudentIdQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.getToday(
      query.student_id,
      query.category_id,
      this.toRequester(req),
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher', 'admin')
  async getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.getById(id, this.toRequester(req));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyPlanDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.dailyPlansService.update(id, dto, this.toRequester(req));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.dailyPlansService.delete(id, this.toRequester(req));
  }

  private toRequester(
    req: Request & { user: AuthRequestUser },
  ): DomanRequester {
    return {
      userId: req.user.userId,
      role: req.user.role,
    };
  }
}
