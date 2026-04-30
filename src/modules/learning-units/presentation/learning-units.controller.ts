import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LearningUnitsService } from '../application/learning-units.service';
import { CreateLearningUnitDto } from '../dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from '../dto/update-learning-unit.dto';

@ApiTags('learning-units')
@Controller('learning-units')
export class LearningUnitsController {
  constructor(private readonly learningUnitsService: LearningUnitsService) {}

  @Get()
  async findAll(): Promise<unknown> {
    return this.learningUnitsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<unknown> {
    return this.learningUnitsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateLearningUnitDto): Promise<unknown> {
    return this.learningUnitsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLearningUnitDto,
  ): Promise<unknown> {
    return this.learningUnitsService.update(id, dto);
  }
}
