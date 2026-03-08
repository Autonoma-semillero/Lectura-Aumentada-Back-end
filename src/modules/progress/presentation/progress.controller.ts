import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProgressService } from '../application/progress.service';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';
import { ListProgressQueryDto } from '../dto/list-progress-query.dto';

@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Get()
  async list(@Query() query: ListProgressQueryDto): Promise<unknown> {
    return this.service.listByStudent(query.student_id ?? '');
  }

  @Post()
  async create(@Body() dto: CreateProgressLogDto): Promise<unknown> {
    return this.service.create(dto);
  }
}
