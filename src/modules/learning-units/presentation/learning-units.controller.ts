import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LearningUnitsService } from '../application/learning-units.service';
import { CreateLearningUnitDto } from '../dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from '../dto/update-learning-unit.dto';

@Controller('learning-units')
export class LearningUnitsController {
  constructor(private readonly service: LearningUnitsService) {}

  @Get()
  async findAll(): Promise<unknown> {
    return this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<unknown> {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateLearningUnitDto): Promise<unknown> {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLearningUnitDto,
  ): Promise<unknown> {
    return this.service.update(id, dto);
  }
}
