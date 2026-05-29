import type {
  CategoryProgressSummary,
  CompletedCardsPaginated,
  StudentSummary,
} from './docente-progress.interface';

export interface CompletedCardsFilter {
  studentId: string;
  categoryId?: string;
  page: number;
  limit: number;
}

export interface IDocenteRepository {
  studentExists(studentId: string): Promise<boolean>;
  getStudentProgressByCategory(studentId: string): Promise<CategoryProgressSummary[]>;
  getCompletedCards(filter: CompletedCardsFilter): Promise<CompletedCardsPaginated>;
  listStudents(): Promise<StudentSummary[]>;
}
