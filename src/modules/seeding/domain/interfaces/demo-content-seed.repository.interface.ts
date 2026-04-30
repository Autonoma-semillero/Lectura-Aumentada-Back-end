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
  /** Valor de `metadata_accessibility.source` (p. ej. demo-content-seed-v2). */
  metadataSource: string;
}

export interface UpsertDemoWordCardInput {
  studentId: string;
  word: string;
  categoryId: string;
  learningUnitId: string;
  categorySlug: string;
  initialLetter: string;
  status: 'new' | 'active' | 'completed' | 'archived';
  timesShown: number;
  timesAudioPlayed: number;
  completedAt?: Date;
}

export interface DemoSeedProgressLogInput {
  user_id: string;
  action: string;
  ts: Date;
  payload: { seed_source: string; word_card_id: string };
  device: string;
  created_at: Date;
}

export interface SeedTodayPlanAndSessionsInput {
  studentId: string;
  wordCardIds: string[];
  categoryId: string;
  planDate: Date;
  seedSource: string;
}

export interface IDemoContentSeedRepository {
  listActiveDemoStudentIds(): Promise<string[]>;
  upsertCategory(input: UpsertDemoCategoryInput): Promise<string>;
  upsertLearningUnit(input: UpsertDemoLearningUnitInput): Promise<string>;
  upsertWordCard(input: UpsertDemoWordCardInput): Promise<string>;
  deleteWordCardsNotInWordList(
    studentId: string,
    categoryId: string,
    words: string[],
  ): Promise<void>;
  deleteProgressLogsByUserAndSeed(
    userId: string,
    seedSource: string,
  ): Promise<void>;
  insertProgressLogs(logs: DemoSeedProgressLogInput[]): Promise<void>;
  resetDemoDomanPlanGraph(
    studentId: string,
    planDate: Date,
    seedSource: string,
  ): Promise<void>;
  seedTodayPlanAndSessions(input: SeedTodayPlanAndSessionsInput): Promise<void>;
}
