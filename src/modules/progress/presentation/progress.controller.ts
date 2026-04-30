import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgressService } from '../application/progress.service';
import { CreateProgressLogDto } from '../dto/create-progress-log.dto';
import { ListProgressQueryDto } from '../dto/list-progress-query.dto';

@ApiTags('progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  async list(@Query() query: ListProgressQueryDto): Promise<unknown> {
    return this.progressService.listByUser(query.user_id ?? '');
  }

  @Post()
  async create(@Body() dto: CreateProgressLogDto): Promise<unknown> {
    return this.progressService.create(dto);
  }
}
