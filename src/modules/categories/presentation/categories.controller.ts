import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../application/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ListCategoriesQueryDto } from '../dto/list-categories-query.dto';
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto';
import { StudentIdQueryDto } from '../dto/student-id-query.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query() query: ListCategoriesQueryDto): Promise<unknown> {
    return this.categoriesService.findAll(query);
  }

  @Get('with-available-word-cards')
  async withAvailableWordCards(
    @Query() query: StudentIdQueryDto,
  ): Promise<unknown> {
    return this.categoriesService.findWithAvailableWordCardsForStudent(
      query.student_id,
    );
  }

  @Post('reorder')
  async reorder(@Body() dto: ReorderCategoriesDto): Promise<unknown> {
    return this.categoriesService.reorder(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<unknown> {
    return this.categoriesService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<unknown> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<unknown> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
