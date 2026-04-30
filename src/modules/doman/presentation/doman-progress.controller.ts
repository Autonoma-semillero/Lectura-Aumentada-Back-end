import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DomanSessionsService } from '../application/doman-sessions.service';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';

@ApiTags('doman-progress')
@Controller('doman/progress')
export class DomanProgressController {
  constructor(private readonly domanSessionsService: DomanSessionsService) {}

  @Get('summary')
  async summary(@Query() query: StudentIdQueryDto): Promise<unknown> {
    return this.domanSessionsService.getProgressSummary(query.student_id);
  }
}
