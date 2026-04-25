import {
  WordCardInsertPayload,
  WordCardPatchPayload,
} from '../types/word-card-repository.payloads';
import { WordCardListed } from './word-card-listed.interface';

export interface IWordCardsRepository {
  findById(id: string): Promise<WordCardListed | null>;
  listByCategoryId(categoryId: string): Promise<WordCardListed[]>;
  listByStudentId(studentId: string): Promise<WordCardListed[]>;
  listByStudentAndCategory(
    studentId: string,
    categoryId: string,
  ): Promise<WordCardListed[]>;
  /** Conteo de tarjetas por `category_id` para un estudiante (mismo criterio que listados filtrados). */
  countWordCardsByCategoryForStudent(
    studentId: string,
  ): Promise<{ categoryId: string; count: number }[]>;
  create(payload: WordCardInsertPayload): Promise<WordCardListed>;
  update(id: string, patch: WordCardPatchPayload): Promise<WordCardListed | null>;
  updateCategoryId(
    id: string,
    categoryId: string | null,
  ): Promise<WordCardListed | null>;
}
