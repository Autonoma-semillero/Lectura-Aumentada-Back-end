export interface UpsertDemoCategoryInput {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface UpsertDemoLearningUnitInput {
  word: string;
  categoryId: string;
  categorySlug: string;
}

export interface UpsertDemoWordCardInput {
  studentId: string;
  word: string;
  initialLetter: string;
  categoryId: string;
  learningUnitId: string;
  categorySlug: string;
  orderIndex: number;
}

export interface DemoProgressLogInput {
  userId: string;
  learningUnitId: string;
  action: 'word_viewed' | 'word_completed';
  ts: Date;
  word: string;
}

export interface IDemoContentSeedRepository {
  findUserIdByEmail(email: string): Promise<string | null>;
  upsertCategory(input: UpsertDemoCategoryInput): Promise<string>;
  upsertLearningUnit(input: UpsertDemoLearningUnitInput): Promise<string>;
  upsertWordCard(input: UpsertDemoWordCardInput): Promise<void>;
  countSeedProgressLogs(userId: string): Promise<number>;
  insertProgressLogs(logs: DemoProgressLogInput[]): Promise<void>;
}
