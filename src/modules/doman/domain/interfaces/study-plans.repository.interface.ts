import type {
  DomanStudyPlan,
  DomanStudyPlanAudienceStudent,
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
  groupIds: string[];
  directStudentIds: string[];
  students: DomanStudyPlanAudienceStudent[];
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
  /**
   * Devuelve el plan activo más antiguo (menor `_id`) cuyo rango solapa el
   * indicado. El orden es parte del contrato: es lo que permite desempatar de
   * forma determinista dos creaciones concurrentes.
   */
  findOverlappingActive(
    studentIds: string[],
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<DomanStudyPlan | null>;
  create(payload: StudyPlanInsertPayload): Promise<DomanStudyPlan>;
  update(
    id: string,
    patch: StudyPlanPatchPayload,
  ): Promise<DomanStudyPlan | null>;
  /** Descarta un plan que perdió la carrera de solapamiento al crearse. */
  delete(id: string): Promise<boolean>;
  /**
   * Revierte los campos mutables de un plan al estado capturado antes de un
   * update que perdió la carrera de solapamiento. A diferencia de `update`,
   * borra explícitamente los opcionales que el plan original no tenía, porque
   * en un patch `undefined` significa "no tocar".
   *
   * No reemplaza el documento entero a propósito: `schema_version` y el
   * `student_id` singleton legacy deben quedar intactos, y `toEntity` infiere
   * ese `student_id` cuando no está, así que reescribirlo lo materializaría.
   */
  restore(plan: DomanStudyPlan): Promise<void>;
}
