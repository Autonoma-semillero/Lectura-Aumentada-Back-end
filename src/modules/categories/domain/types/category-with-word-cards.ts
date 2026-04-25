import { Category } from '../interfaces/category.interface';

export type CategoryWithWordCardAvailability = Category & {
  available_word_cards_count: number;
};
