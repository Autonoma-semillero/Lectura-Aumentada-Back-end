import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { PlanAssignmentsService } from '../application/plan-assignments.service';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import { ListPlanAssignmentsQueryDto } from '../dto/list-plan-assignments-query.dto';

@ApiTags('doman-plan-assignments')
@Controller('doman/plan-assignments')
@UseGuards(RolesGuard)
@Roles('teacher', 'admin')
export class PlanAssignmentsController {
  constructor(
    private readonly planAssignmentsService: PlanAssignmentsService,
  ) {}

  @Get()
  async list(
    @Query() query: ListPlanAssignmentsQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ) {
    return this.planAssignmentsService.list(query, this.toRequester(req));
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ) {
    return this.planAssignmentsService.getById(id, this.toRequester(req));
  }

  private toRequester(
    req: Request & { user: AuthRequestUser },
  ): DomanRequester {
    return { userId: req.user.userId, role: req.user.role };
  }
}
