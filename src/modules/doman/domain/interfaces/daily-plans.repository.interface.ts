import { DomanDailyPlan } from './doman-daily-plan.interface';

export interface DailyPlanInsertPayload {
  studentId: string;
  planDateUtcMidnight: Date;
  targetCardsCount: number;
  targetSessionsCount: number;
  categoryId: string;
  studyPlanId?: string;
  studyPlanLevelId?: string;
  algorithmVersion?: string;
  notes?: string;
}

export interface DailyPlanPatchPayload {
  targetCardsCount?: number;
  targetSessionsCount?: number;
  categoryId?: string;
  studyPlanId?: string;
  studyPlanLevelId?: string;
  algorithmVersion?: string;
  notes?: string;
}

export interface IDailyPlansRepository {
  findById(id: string): Promise<DomanDailyPlan | null>;
  findByStudentAndPlanDate(
    studentId: string,
    planDateUtcMidnight: Date,
    categoryId: string,
    studyPlanId?: string,
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
  /**
   * Reemplaza el documento completo por el capturado antes de una
   * regeneración destructiva. A diferencia de `update`, deja ausentes los
   * campos opcionales que el plan original no tenía: un patch no puede
   * borrarlos porque `undefined` significa "no tocar".
   */
  restore(plan: DomanDailyPlan): Promise<void>;
  delete(id: string): Promise<boolean>;
}
