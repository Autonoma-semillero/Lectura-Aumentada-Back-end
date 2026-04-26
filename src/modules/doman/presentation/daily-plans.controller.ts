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
import { DailyPlansService } from '../application/daily-plans.service';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { ListDailyPlansQueryDto } from '../dto/list-daily-plans-query.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';

@ApiTags('doman-daily-plans')
@Controller('doman/daily-plans')
export class DailyPlansController {
  constructor(private readonly dailyPlansService: DailyPlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDailyPlanDto): Promise<unknown> {
    return this.dailyPlansService.create(dto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Body() dto: GenerateDailyPlanDto): Promise<unknown> {
    return this.dailyPlansService.generate(dto);
  }

  @Get()
  async list(@Query() query: ListDailyPlansQueryDto): Promise<unknown> {
    return this.dailyPlansService.list(query);
  }

  @Get('today')
  async today(@Query() query: StudentIdQueryDto): Promise<unknown> {
    return this.dailyPlansService.getToday(query.student_id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<unknown> {
    return this.dailyPlansService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyPlanDto,
  ): Promise<unknown> {
    return this.dailyPlansService.update(id, dto);
  }
}
