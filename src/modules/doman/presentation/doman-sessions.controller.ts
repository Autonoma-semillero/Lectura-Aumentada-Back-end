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
import { CreateDomanSessionDto } from '../dto/create-doman-session.dto';
import { ListDomanSessionsQueryDto } from '../dto/list-doman-sessions-query.dto';
import { UpdateDomanSessionDto } from '../dto/update-doman-session.dto';

@ApiTags('doman-sessions')
@Controller('doman-sessions')
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

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<unknown> {
    return this.domanSessionsService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomanSessionDto,
  ): Promise<unknown> {
    return this.domanSessionsService.update(id, dto);
  }
}
