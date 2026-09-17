import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { DomanSessionsService } from '../application/doman-sessions.service';
import type { DomanRequester } from '../domain/types/doman-requester.type';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';

@ApiTags('doman-progress')
@UseGuards(RolesGuard)
@Roles('student', 'teacher', 'admin')
@Controller('doman/progress')
export class DomanProgressController {
  constructor(private readonly domanSessionsService: DomanSessionsService) {}

  @Get('summary')
  async summary(
    @Query() query: StudentIdQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<unknown> {
    return this.domanSessionsService.getProgressSummary(
      query.student_id,
      this.toRequester(req),
    );
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
