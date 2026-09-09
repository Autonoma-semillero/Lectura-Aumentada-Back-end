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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
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
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  async reorder(@Body() dto: ReorderCategoriesDto): Promise<unknown> {
    return this.categoriesService.reorder(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<unknown> {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  async create(@Body() dto: CreateCategoryDto): Promise<unknown> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<unknown> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
