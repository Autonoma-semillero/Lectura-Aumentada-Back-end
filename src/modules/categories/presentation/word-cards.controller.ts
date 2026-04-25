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
import { WordCardsService } from '../application/word-cards.service';
import { CreateWordCardDto } from '../dto/create-word-card.dto';
import { ListWordCardsQueryDto } from '../dto/list-word-cards-query.dto';
import { UpdateWordCardCategoryDto } from '../dto/update-word-card-category.dto';
import { UpdateWordCardDto } from '../dto/update-word-card.dto';

@ApiTags('word-cards')
@Controller('word-cards')
export class WordCardsController {
  constructor(private readonly wordCardsService: WordCardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWordCardDto): Promise<unknown> {
    return this.wordCardsService.create(dto);
  }

  @Get()
  async list(@Query() query: ListWordCardsQueryDto): Promise<unknown> {
    return this.wordCardsService.listByQuery(query);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<unknown> {
    return this.wordCardsService.getById(id);
  }

  @Patch(':id/category')
  async setCategory(
    @Param('id') id: string,
    @Body() dto: UpdateWordCardCategoryDto,
  ): Promise<unknown> {
    return this.wordCardsService.setCategory(id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWordCardDto,
  ): Promise<unknown> {
    return this.wordCardsService.update(id, dto);
  }
}
