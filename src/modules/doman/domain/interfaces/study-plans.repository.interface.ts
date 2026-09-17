import type {
  DomanStudyPlan,
  DomanStudyPlanLevel,
  DomanStudyPlanStatus,
} from './doman-study-plan.interface';
import type {
  DomanSessionAudioMode,
  DomanSessionMode,
} from './doman-session.interface';

export interface StudyPlanInsertPayload {
  name: string;
  description?: string;
  studentId: string;
  startDate: Date;
  endDate: Date;
  sessionsPerDay: number;
  displayMs: number;
  audioMode: DomanSessionAudioMode;
  mode: DomanSessionMode;
  status: DomanStudyPlanStatus;
  levels: DomanStudyPlanLevel[];
  createdBy: string;
}

export interface StudyPlanPatchPayload {
  name?: string;
  description?: string;
  studentId?: string;
  startDate?: Date;
  endDate?: Date;
  sessionsPerDay?: number;
  displayMs?: number;
  audioMode?: DomanSessionAudioMode;
  mode?: DomanSessionMode;
  status?: DomanStudyPlanStatus;
  levels?: DomanStudyPlanLevel[];
}

export interface StudyPlanListFilter {
  studentId?: string;
  status?: DomanStudyPlanStatus;
  createdBy?: string;
}

export interface IStudyPlansRepository {
  findAll(filter: StudyPlanListFilter): Promise<DomanStudyPlan[]>;
  findById(id: string): Promise<DomanStudyPlan | null>;
  findActiveForStudentAndDate(
    studentId: string,
    date: Date,
  ): Promise<DomanStudyPlan | null>;
  findOverlappingActive(
    studentId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<DomanStudyPlan | null>;
  create(payload: StudyPlanInsertPayload): Promise<DomanStudyPlan>;
  update(
    id: string,
    patch: StudyPlanPatchPayload,
  ): Promise<DomanStudyPlan | null>;
}
