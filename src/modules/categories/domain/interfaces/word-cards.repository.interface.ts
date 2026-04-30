import {
  WordCardExposurePatchPayload,
  WordCardInsertPayload,
  WordCardPatchPayload,
  WordCardStatus,
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
  listByStudentAndStatuses(
    studentId: string,
    statuses: WordCardStatus[],
  ): Promise<WordCardListed[]>;
  listByStudentCategoryAndStatuses(
    studentId: string,
    categoryId: string,
    statuses: WordCardStatus[],
  ): Promise<WordCardListed[]>;
  countWordCardsByCategoryForStudent(
    studentId: string,
  ): Promise<{ categoryId: string; count: number }[]>;
  create(payload: WordCardInsertPayload): Promise<WordCardListed>;
  update(id: string, patch: WordCardPatchPayload): Promise<WordCardListed | null>;
  applyExposure(
    id: string,
    patch: WordCardExposurePatchPayload,
  ): Promise<WordCardListed | null>;
  updateCategoryId(
    id: string,
    categoryId: string | null,
  ): Promise<WordCardListed | null>;
}
