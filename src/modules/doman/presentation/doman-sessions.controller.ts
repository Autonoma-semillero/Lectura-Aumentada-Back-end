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
import { DomanSessionsService } from '../application/doman-sessions.service';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import { CompleteSessionDto } from '../dto/complete-session.dto';
import { AddDomanSessionsDto } from '../dto/add-doman-sessions.dto';
import { CreateDomanSessionDto } from '../dto/create-doman-session.dto';
import { CreateExposureEventDto } from '../dto/create-exposure-event.dto';
import { ListDomanSessionsQueryDto } from '../dto/list-doman-sessions-query.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateDomanSessionDto } from '../dto/update-doman-session.dto';

@ApiTags('doman-sessions')
@UseGuards(RolesGuard)
@Roles('student', 'teacher', 'admin')
@Controller('doman/sessions')
export class DomanSessionsController {
  constructor(private readonly domanSessionsService: DomanSessionsService) {}

  @Post()
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDomanSessionDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.create(dto, this.toRequester(req));
  }

  @Get()
  async list(
    @Query() query: ListDomanSessionsQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.list(query, this.toRequester(req));
  }

  @Get('next')
  async next(
    @Query() query: StudentIdQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.getNext(query, this.toRequester(req));
  }

  @Get('history')
  async history(
    @Query() query: StudentIdQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.getHistory(
      query.student_id,
      this.toRequester(req),
    );
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.getDetailedById(id, this.toRequester(req));
  }

  @Patch(':id')
  @Roles('teacher', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomanSessionDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.update(id, dto, this.toRequester(req));
  }

  @Post('daily-plan/:dailyPlanId')
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async addToDailyPlan(
    @Param('dailyPlanId') dailyPlanId: string,
    @Body() dto: AddDomanSessionsDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.addToDailyPlan(
      dailyPlanId,
      dto,
      this.toRequester(req),
    );
  }

  @Post('daily-plan/:dailyPlanId/restore')
  @Roles('teacher', 'admin')
  async restoreDailyPlan(
    @Param('dailyPlanId') dailyPlanId: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.restoreDailyPlan(
      dailyPlanId,
      this.toRequester(req),
    );
  }

  @Delete('daily-plan/:dailyPlanId')
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDailyPlanSessions(
    @Param('dailyPlanId') dailyPlanId: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.domanSessionsService.deleteDailyPlanSessions(
      dailyPlanId,
      this.toRequester(req),
    );
  }

  @Post(':id/restore')
  @Roles('teacher', 'admin')
  async restore(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.restore(id, this.toRequester(req));
  }

  @Delete(':id')
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.domanSessionsService.delete(id, this.toRequester(req));
  }

  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.start(id, this.toRequester(req));
  }

  @Post(':id/exposures')
  async createExposure(
    @Param('id') id: string,
    @Body() dto: CreateExposureEventDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.registerExposure(
      id,
      dto,
      this.toRequester(req),
    );
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteSessionDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.complete(id, dto, this.toRequester(req));
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
