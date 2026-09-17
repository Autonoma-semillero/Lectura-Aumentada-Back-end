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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { StudyPlansService } from '../application/study-plans.service';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import { CreateStudyPlanDto } from '../dto/create-study-plan.dto';
import { GenerateStudyPlanDayDto } from '../dto/generate-study-plan-day.dto';
import { GetActiveStudyPlanQueryDto } from '../dto/get-active-study-plan-query.dto';
import { ListStudyPlansQueryDto } from '../dto/list-study-plans-query.dto';
import { UpdateStudyPlanDto } from '../dto/update-study-plan.dto';

@ApiTags('doman-study-plans')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('teacher', 'admin')
@Controller('doman/study-plans')
export class StudyPlansController {
  constructor(private readonly studyPlansService: StudyPlansService) {}

  @Get()
  async list(
    @Query() query: ListStudyPlansQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.list(query, this.toRequester(req));
  }

  @Get('active')
  @Roles('student', 'teacher', 'admin')
  async getActive(
    @Query() query: GetActiveStudyPlanQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.getActiveConfiguration(
      query,
      this.toRequester(req),
    );
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.getById(id, this.toRequester(req));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateStudyPlanDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.create(dto, this.toRequester(req));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudyPlanDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.update(id, dto, this.toRequester(req));
  }

  @Post(':id/generate-day')
  async generateDay(
    @Param('id') id: string,
    @Body() dto: GenerateStudyPlanDayDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.studyPlansService.generateDay(
      id,
      dto,
      this.toRequester(req),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.studyPlansService.archive(id, this.toRequester(req));
  }

  private toRequester(
    req: Request & { user: AuthRequestUser },
  ): DomanRequester {
    return { userId: req.user.userId, role: req.user.role };
  }
}
