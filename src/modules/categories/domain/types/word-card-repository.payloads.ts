export type WordCardStatus = 'new' | 'active' | 'completed' | 'archived';

export interface WordCardInsertPayload {
  studentId: string;
  word: string;
  initialLetter: string;
  audioUrl: string;
  categoryId: string;
  status: WordCardStatus;
  language?: string;
  learningUnitId?: string;
}

export interface WordCardPatchPayload {
  word?: string;
  initialLetter?: string;
  audioUrl?: string;
  categoryId?: string;
  status?: WordCardStatus;
  language?: string;
  learningUnitId?: string;
}
