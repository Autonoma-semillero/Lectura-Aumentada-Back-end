import { StudentGroupMembership } from './student-group-membership.interface';
import { StudentGroup, StudentGroupStatus } from './student-group.interface';

export type GroupsListFilter = {
  teacher_id?: string;
  q?: string;
  status?: StudentGroupStatus;
  limit?: number;
};

export type CreateStudentGroupPayload = Pick<
  StudentGroup,
  'name' | 'normalized_name' | 'teacher_id' | 'status' | 'created_by'
> &
  Partial<Pick<StudentGroup, 'description'>>;

export interface IGroupsRepository {
  findAll(filter: GroupsListFilter): Promise<StudentGroup[]>;
  findById(id: string): Promise<StudentGroup | null>;
  findByIds(ids: string[]): Promise<StudentGroup[]>;
  create(payload: CreateStudentGroupPayload): Promise<StudentGroup>;
  update(
    id: string,
    payload: Partial<
      Pick<StudentGroup, 'name' | 'normalized_name' | 'description' | 'status'>
    >,
  ): Promise<StudentGroup | null>;
  findMembershipsByGroupIds(
    groupIds: string[],
  ): Promise<StudentGroupMembership[]>;
  findMembershipsByStudentIds(
    studentIds: string[],
    groupIds?: string[],
  ): Promise<StudentGroupMembership[]>;
  addMemberships(
    groupId: string,
    studentIds: string[],
    addedBy: string,
  ): Promise<void>;
  removeMembership(groupId: string, studentId: string): Promise<boolean>;
  removeMembershipsByGroupId(groupId: string): Promise<void>;
}
