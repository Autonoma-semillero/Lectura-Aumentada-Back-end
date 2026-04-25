import { Module } from '@nestjs/common';
import { CategoriesService } from './application/categories.service';
import { WordCardsService } from './application/word-cards.service';
import {
  CATEGORIES_REPOSITORY,
  WORD_CARDS_REPOSITORY,
} from './domain/constants/categories.tokens';
import { CategoriesRepository } from './infrastructure/repositories/categories.repository';
import { WordCardsRepository } from './infrastructure/repositories/word-cards.repository';
import { CategoriesController } from './presentation/categories.controller';
import { CategoryWordCardsController } from './presentation/category-word-cards.controller';
import { WordCardsController } from './presentation/word-cards.controller';

@Module({
  controllers: [
    CategoryWordCardsController,
    CategoriesController,
    WordCardsController,
  ],
  providers: [
    CategoriesService,
    WordCardsService,
    {
      provide: CATEGORIES_REPOSITORY,
      useClass: CategoriesRepository,
    },
    {
      provide: WORD_CARDS_REPOSITORY,
      useClass: WordCardsRepository,
    },
  ],
  exports: [CategoriesService, WordCardsService],
})
export class CategoriesModule {}
