import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WordCardsService } from '../application/word-cards.service';

@ApiTags('word-cards')
@Controller('categories')
export class CategoryWordCardsController {
  constructor(private readonly wordCardsService: WordCardsService) {}

  @Get(':categoryId/word-cards')
  async listByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<unknown> {
    return this.wordCardsService.listByCategory(categoryId);
  }
}
