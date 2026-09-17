import {
  DomanPlanAssignment,
  DomanPlanAssignmentResult,
  DomanPlanAssignmentStatus,
  DomanPlanAssignmentStudent,
  DomanPlanAssignmentSummary,
} from './doman-plan-assignment.interface';

export interface PlanAssignmentInsertPayload {
  groupIds: string[];
  directStudentIds: string[];
  students: DomanPlanAssignmentStudent[];
  categoryId?: string;
  planDate: Date;
  targetCardsCount?: number;
  targetSessionsCount?: number;
  displayMs?: number;
  force: boolean;
  createdBy: string;
}

export interface PlanAssignmentCompletionPayload {
  status: Exclude<DomanPlanAssignmentStatus, 'processing'>;
  summary: DomanPlanAssignmentSummary;
  results: DomanPlanAssignmentResult[];
}

export interface IPlanAssignmentsRepository {
  create(payload: PlanAssignmentInsertPayload): Promise<DomanPlanAssignment>;
  complete(
    id: string,
    payload: PlanAssignmentCompletionPayload,
  ): Promise<DomanPlanAssignment | null>;
  findById(id: string): Promise<DomanPlanAssignment | null>;
  list(filters: {
    createdBy?: string;
    status?: DomanPlanAssignmentStatus;
    limit: number;
  }): Promise<DomanPlanAssignment[]>;
}
