import { DomanDailyPlan } from './doman-daily-plan.interface';

export interface DailyPlanInsertPayload {
  studentId: string;
  planDateUtcMidnight: Date;
  targetCardsCount: number;
  targetSessionsCount: number;
  categoryId: string;
  algorithmVersion?: string;
  notes?: string;
}

export interface DailyPlanPatchPayload {
  targetCardsCount?: number;
  targetSessionsCount?: number;
  categoryId?: string;
  algorithmVersion?: string;
  notes?: string;
}

export interface IDailyPlansRepository {
  findById(id: string): Promise<DomanDailyPlan | null>;
  findByStudentAndPlanDate(
    studentId: string,
    planDateUtcMidnight: Date,
    categoryId?: string,
  ): Promise<DomanDailyPlan | null>;
  findByStudentAndDateRange(
    studentId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<DomanDailyPlan[]>;
  create(payload: DailyPlanInsertPayload): Promise<DomanDailyPlan>;
  update(
    id: string,
    patch: DailyPlanPatchPayload,
  ): Promise<DomanDailyPlan | null>;
  delete(id: string): Promise<boolean>;
}
