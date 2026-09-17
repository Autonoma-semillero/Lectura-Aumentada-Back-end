import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { UsersService } from '../../users/application/users.service';
import { User } from '../../users/domain/interfaces/user.interface';
import { GROUPS_REPOSITORY } from '../domain/constants/groups.tokens';
import { StudentGroupMembership } from '../domain/interfaces/student-group-membership.interface';
import { StudentGroup } from '../domain/interfaces/student-group.interface';
import { IGroupsRepository } from '../domain/interfaces/groups.repository.interface';
import { normalizeGroupName } from '../domain/types/group-name-normalization';
import { GroupsRequester } from '../domain/types/groups-requester.type';
import {
  AudienceSource,
  ResolvedAudience,
  ResolvedAudienceStudent,
} from '../domain/types/resolved-audience.type';
import { AddGroupMembersDto } from '../dto/add-group-members.dto';
import {
  AudienceSearchItemDto,
  AudienceSearchResponseDto,
  GroupAudienceItemDto,
  StudentAudienceItemDto,
} from '../dto/audience-search-response.dto';
import { CreateGroupDto } from '../dto/create-group.dto';
import { GroupResponseDto } from '../dto/group-response.dto';
import { ListGroupsQueryDto } from '../dto/list-groups-query.dto';
import { SearchAudienceQueryDto } from '../dto/search-audience-query.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @Inject(GROUPS_REPOSITORY)
    private readonly groupsRepository: IGroupsRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(
    query: ListGroupsQueryDto,
    requester: GroupsRequester,
  ): Promise<GroupResponseDto[]> {
    const groups = await this.groupsRepository.findAll({
      teacher_id: requester.role === 'teacher' ? requester.userId : undefined,
      q: query.q ? normalizeGroupName(query.q) : undefined,
      status: query.status,
    });
    return this.withStudentIds(groups);
  }

  async searchAudience(
    query: SearchAudienceQueryDto,
    requester: GroupsRequester,
  ): Promise<AudienceSearchResponseDto> {
    const limit = query.limit ?? 30;
    const searchTerm = query.q?.trim() ?? '';
    const accessibleGroups = await this.groupsRepository.findAll({
      teacher_id: requester.role === 'teacher' ? requester.userId : undefined,
      status: 'active',
    });
    if (query.unassigned) {
      return {
        items: await this.searchUnassignedStudents(
          searchTerm,
          limit,
          accessibleGroups.map((group) => group.id),
        ),
      };
    }

    const students = await this.usersService.searchStudents(
      searchTerm,
      Math.max(limit, 100),
    );
    const normalizedSearchTerm = normalizeGroupName(searchTerm);
    const groups = accessibleGroups
      .filter(
        (group) =>
          !normalizedSearchTerm ||
          group.normalized_name.includes(normalizedSearchTerm),
      )
      .slice(0, 100);

    const [studentMemberships, groupMemberships] = await Promise.all([
      this.groupsRepository.findMembershipsByStudentIds(
        students.map((student) => student.id),
        accessibleGroups.map((group) => group.id),
      ),
      this.groupsRepository.findMembershipsByGroupIds(
        groups.map((group) => group.id),
      ),
    ]);
    const groupIdsByStudent = this.groupIdsByStudent(studentMemberships);
    const studentIdsByGroup = this.studentIdsByGroup(groupMemberships);

    const studentItems: StudentAudienceItemDto[] = students
      .map((student) =>
        this.toStudentAudienceItem(
          student,
          groupIdsByStudent.get(student.id) ?? [],
        ),
      )
      .filter((item) => !query.unassigned || item.unassigned);
    const groupItems: GroupAudienceItemDto[] = groups.map((group) => ({
      type: 'group',
      audience_key: `group:${group.id}`,
      id: group.id,
      name: group.name,
      description: group.description,
      teacher_id: group.teacher_id,
      status: group.status,
      student_ids: studentIdsByGroup.get(group.id) ?? [],
    }));

    const items: AudienceSearchItemDto[] = [...studentItems, ...groupItems];
    items.sort((left, right) => {
      const byLabel = this.audienceLabel(left).localeCompare(
        this.audienceLabel(right),
        'es',
        { sensitivity: 'base' },
      );
      return byLabel || left.audience_key.localeCompare(right.audience_key);
    });
    return { items: items.slice(0, limit) };
  }

  async getById(
    id: string,
    requester: GroupsRequester,
  ): Promise<GroupResponseDto> {
    const group = await this.getManagedGroup(id, requester);
    return this.withStudentIdsForGroup(group);
  }

  async create(
    dto: CreateGroupDto,
    requester: GroupsRequester,
  ): Promise<GroupResponseDto> {
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeGroupName(name);
    if (!normalizedName) {
      throw new BadRequestException('Group name cannot be empty');
    }
    const teacherId = await this.resolveTeacherId(dto.teacher_id, requester);
    this.assertObjectId(teacherId, 'teacher_id');

    const studentIds = this.uniqueObjectIds(
      dto.student_ids ?? [],
      'student_ids',
    );
    await this.assertStudents(studentIds);
    let group: StudentGroup;
    try {
      group = await this.groupsRepository.create({
        name,
        normalized_name: normalizedName,
        description: dto.description?.trim(),
        teacher_id: teacherId,
        status: 'active',
        created_by: requester.userId,
      });
    } catch (error) {
      this.rethrowDuplicateGroupName(error);
      throw error;
    }
    await this.groupsRepository.addMemberships(
      group.id,
      studentIds,
      requester.userId,
    );
    return this.toGroupResponse(group, studentIds);
  }

  async update(
    id: string,
    dto: UpdateGroupDto,
    requester: GroupsRequester,
  ): Promise<GroupResponseDto> {
    await this.getManagedGroup(id, requester);
    const name = dto.name?.trim().replace(/\s+/g, ' ');
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Group name cannot be empty');
    }
    let updated: StudentGroup | null;
    try {
      updated = await this.groupsRepository.update(id, {
        name,
        normalized_name: name ? normalizeGroupName(name) : undefined,
        description: dto.description?.trim(),
        status: dto.status,
      });
    } catch (error) {
      this.rethrowDuplicateGroupName(error);
      throw error;
    }
    if (!updated) {
      throw new NotFoundException('Student group not found');
    }
    if (dto.status === 'archived') {
      await this.groupsRepository.removeMembershipsByGroupId(id);
      return this.toGroupResponse(updated, []);
    }
    return this.withStudentIdsForGroup(updated);
  }

  async archive(id: string, requester: GroupsRequester): Promise<void> {
    await this.getManagedGroup(id, requester);
    const archived = await this.groupsRepository.update(id, {
      status: 'archived',
    });
    if (!archived) {
      throw new NotFoundException('Student group not found');
    }
    await this.groupsRepository.removeMembershipsByGroupId(id);
  }

  async addMembers(
    id: string,
    dto: AddGroupMembersDto,
    requester: GroupsRequester,
  ): Promise<GroupResponseDto> {
    const group = await this.getManagedGroup(id, requester);
    if (group.status !== 'active') {
      throw new BadRequestException('Cannot add students to an archived group');
    }
    const studentIds = this.uniqueObjectIds(dto.student_ids, 'student_ids');
    await this.assertStudents(studentIds);
    await this.groupsRepository.addMemberships(
      group.id,
      studentIds,
      requester.userId,
    );
    return this.withStudentIdsForGroup(group);
  }

  async removeMember(
    id: string,
    studentId: string,
    requester: GroupsRequester,
  ): Promise<void> {
    await this.getManagedGroup(id, requester);
    this.assertObjectId(studentId, 'studentId');
    const removed = await this.groupsRepository.removeMembership(id, studentId);
    if (!removed) {
      throw new NotFoundException('Student is not a member of this group');
    }
  }

  async resolveAudience(
    groupIds: string[],
    directStudentIds: string[],
    requester: GroupsRequester,
  ): Promise<ResolvedAudience> {
    const requestedGroupIds = this.uniqueObjectIds(groupIds, 'group_ids');
    const requestedStudentIds = this.uniqueObjectIds(
      directStudentIds,
      'student_ids',
    );
    if (requestedGroupIds.length === 0 && requestedStudentIds.length === 0) {
      throw new BadRequestException(
        'At least one group_id or student_id is required',
      );
    }

    const groups = await this.groupsRepository.findByIds(requestedGroupIds);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const missingGroupIds = requestedGroupIds.filter(
      (groupId) => !groupById.has(groupId),
    );
    if (missingGroupIds.length > 0) {
      throw new NotFoundException(
        `Student groups not found: ${missingGroupIds.join(', ')}`,
      );
    }
    for (const groupId of requestedGroupIds) {
      const group = groupById.get(groupId);
      if (!group) {
        continue;
      }
      this.assertCanManage(group, requester);
      if (group.status !== 'active') {
        throw new BadRequestException(`Student group ${group.id} is archived`);
      }
    }

    const memberships =
      await this.groupsRepository.findMembershipsByGroupIds(requestedGroupIds);
    const resolvedByStudent = new Map<string, ResolvedAudienceStudent>();
    for (const studentId of requestedStudentIds) {
      this.addAudienceSource(resolvedByStudent, studentId, { type: 'direct' });
    }
    for (const groupId of requestedGroupIds) {
      for (const membership of memberships) {
        if (membership.group_id === groupId) {
          this.addAudienceSource(resolvedByStudent, membership.student_id, {
            type: 'group',
            group_id: groupId,
          });
        }
      }
    }

    const studentIds = [...resolvedByStudent.keys()];
    await this.assertStudents(studentIds);
    return {
      student_ids: studentIds,
      students: [...resolvedByStudent.values()],
    };
  }

  private async resolveTeacherId(
    requestedTeacherId: string | undefined,
    requester: GroupsRequester,
  ): Promise<string> {
    if (
      requester.role === 'teacher' &&
      requestedTeacherId !== undefined &&
      requestedTeacherId.toLowerCase() !== requester.userId.toLowerCase()
    ) {
      throw new ForbiddenException(
        'Teachers can only create groups owned by themselves',
      );
    }
    if (requester.role === 'teacher') {
      return requester.userId;
    }
    if (requestedTeacherId === undefined) {
      throw new BadRequestException(
        'teacher_id is required when an administrator creates a group',
      );
    }
    const teacher =
      await this.usersService.getPublicUserById(requestedTeacherId);
    if (
      !teacher ||
      teacher.status !== 'active' ||
      !teacher.roles.includes('teacher')
    ) {
      throw new BadRequestException(
        'teacher_id must reference an active user with the teacher role',
      );
    }
    return requestedTeacherId;
  }

  private rethrowDuplicateGroupName(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException(
        'An active group with this name already exists for the teacher',
      );
    }
  }

  private async getManagedGroup(
    id: string,
    requester: GroupsRequester,
  ): Promise<StudentGroup> {
    this.assertObjectId(id, 'group id');
    const group = await this.groupsRepository.findById(id);
    if (!group) {
      throw new NotFoundException('Student group not found');
    }
    this.assertCanManage(group, requester);
    return group;
  }

  private assertCanManage(
    group: StudentGroup,
    requester: GroupsRequester,
  ): void {
    if (
      requester.role === 'teacher' &&
      group.teacher_id.toLowerCase() !== requester.userId.toLowerCase()
    ) {
      throw new ForbiddenException(
        'Teachers can only manage their own student groups',
      );
    }
  }

  private async assertStudents(studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) {
      return;
    }
    const students = await this.usersService.findStudentsByIds(studentIds);
    const foundIds = new Set(
      students.map((student) => student.id.toLowerCase()),
    );
    const invalidIds = studentIds.filter(
      (studentId) => !foundIds.has(studentId.toLowerCase()),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Users are missing or do not have the student role: ${invalidIds.join(', ')}`,
      );
    }
  }

  private assertObjectId(value: string, field: string): void {
    if (!isMongoObjectId(value)) {
      throw new BadRequestException(`${field} must be a valid Mongo ObjectId`);
    }
  }

  private uniqueObjectIds(values: string[], field: string): string[] {
    const unique = [...new Set(values.map((value) => value.toLowerCase()))];
    for (const value of unique) {
      this.assertObjectId(value, field);
    }
    return unique;
  }

  private async withStudentIds(
    groups: StudentGroup[],
  ): Promise<GroupResponseDto[]> {
    const memberships = await this.groupsRepository.findMembershipsByGroupIds(
      groups.map((group) => group.id),
    );
    const studentIdsByGroup = this.studentIdsByGroup(memberships);
    return groups.map((group) =>
      this.toGroupResponse(group, studentIdsByGroup.get(group.id) ?? []),
    );
  }

  private async withStudentIdsForGroup(
    group: StudentGroup,
  ): Promise<GroupResponseDto> {
    const memberships = await this.groupsRepository.findMembershipsByGroupIds([
      group.id,
    ]);
    return this.toGroupResponse(
      group,
      memberships.map((membership) => membership.student_id),
    );
  }

  private toGroupResponse(
    group: StudentGroup,
    studentIds: string[],
  ): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      normalized_name: group.normalized_name,
      description: group.description,
      teacher_id: group.teacher_id,
      status: group.status,
      created_by: group.created_by,
      student_ids: [...new Set(studentIds)],
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  }

  private studentIdsByGroup(
    memberships: StudentGroupMembership[],
  ): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const membership of memberships) {
      const studentIds = result.get(membership.group_id) ?? [];
      if (!studentIds.includes(membership.student_id)) {
        studentIds.push(membership.student_id);
      }
      result.set(membership.group_id, studentIds);
    }
    return result;
  }

  private groupIdsByStudent(
    memberships: StudentGroupMembership[],
  ): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const membership of memberships) {
      const groupIds = result.get(membership.student_id) ?? [];
      if (!groupIds.includes(membership.group_id)) {
        groupIds.push(membership.group_id);
      }
      result.set(membership.student_id, groupIds);
    }
    return result;
  }

  private toStudentAudienceItem(
    student: User,
    groupIds: string[],
  ): StudentAudienceItemDto {
    return {
      type: 'student',
      audience_key: `student:${student.id}`,
      id: student.id,
      display_name: student.display_name,
      email: student.email,
      username: student.username,
      group_ids: [...new Set(groupIds)],
      unassigned: groupIds.length === 0,
    };
  }

  private async searchUnassignedStudents(
    query: string,
    limit: number,
    accessibleGroupIds: string[],
  ): Promise<StudentAudienceItemDto[]> {
    const pageSize = 100;
    const items: StudentAudienceItemDto[] = [];
    let offset = 0;

    while (items.length < limit) {
      const students = await this.usersService.searchStudents(
        query,
        pageSize,
        offset,
      );
      if (students.length === 0) {
        break;
      }
      const memberships =
        accessibleGroupIds.length === 0
          ? []
          : await this.groupsRepository.findMembershipsByStudentIds(
              students.map((student) => student.id),
              accessibleGroupIds,
            );
      const groupIdsByStudent = this.groupIdsByStudent(memberships);
      for (const student of students) {
        const groupIds = groupIdsByStudent.get(student.id) ?? [];
        if (groupIds.length === 0) {
          items.push(this.toStudentAudienceItem(student, []));
          if (items.length === limit) {
            break;
          }
        }
      }
      offset += students.length;
      if (students.length < pageSize) {
        break;
      }
    }
    return items;
  }

  private audienceLabel(item: AudienceSearchItemDto): string {
    return item.type === 'group'
      ? item.name
      : (item.display_name ?? item.username ?? item.email);
  }

  private addAudienceSource(
    resolved: Map<string, ResolvedAudienceStudent>,
    studentId: string,
    source: AudienceSource,
  ): void {
    const existing = resolved.get(studentId) ?? {
      student_id: studentId,
      sources: [],
    };
    const hasSource = existing.sources.some((candidate) => {
      if (candidate.type !== source.type) {
        return false;
      }
      return candidate.type === 'direct'
        ? true
        : candidate.group_id === (source as { group_id: string }).group_id;
    });
    if (!hasSource) {
      existing.sources.push(source);
    }
    resolved.set(studentId, existing);
  }
}
