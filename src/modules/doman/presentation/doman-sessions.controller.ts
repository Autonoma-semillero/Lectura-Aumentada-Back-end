import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DomanSessionsService } from '../application/doman-sessions.service';
import { CompleteSessionDto } from '../dto/complete-session.dto';
import { CreateDomanSessionDto } from '../dto/create-doman-session.dto';
import { CreateExposureEventDto } from '../dto/create-exposure-event.dto';
import { ListDomanSessionsQueryDto } from '../dto/list-doman-sessions-query.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateDomanSessionDto } from '../dto/update-doman-session.dto';

@ApiTags('doman-sessions')
@Controller('doman/sessions')
export class DomanSessionsController {
  constructor(private readonly domanSessionsService: DomanSessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDomanSessionDto): Promise<unknown> {
    return this.domanSessionsService.create(dto);
  }

  @Get()
  async list(@Query() query: ListDomanSessionsQueryDto): Promise<unknown> {
    return this.domanSessionsService.list(query);
  }

  @Get('next')
  async next(@Query() query: StudentIdQueryDto): Promise<unknown> {
    return this.domanSessionsService.getNext(query);
  }

  @Get('history')
  async history(@Query() query: StudentIdQueryDto): Promise<unknown> {
    return this.domanSessionsService.getHistory(query.student_id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<unknown> {
    return this.domanSessionsService.getDetailedById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomanSessionDto,
  ): Promise<unknown> {
    return this.domanSessionsService.update(id, dto);
  }

  @Post(':id/start')
  async start(@Param('id') id: string): Promise<unknown> {
    return this.domanSessionsService.start(id);
  }

  @Post(':id/exposures')
  async createExposure(
    @Param('id') id: string,
    @Body() dto: CreateExposureEventDto,
  ): Promise<unknown> {
    return this.domanSessionsService.registerExposure(id, dto);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteSessionDto,
  ): Promise<unknown> {
    return this.domanSessionsService.complete(id, dto);
  }
}
