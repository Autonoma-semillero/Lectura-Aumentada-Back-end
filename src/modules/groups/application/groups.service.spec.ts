import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersService } from '../../users/application/users.service';
import type { User } from '../../users/domain/interfaces/user.interface';
import { GROUPS_REPOSITORY } from '../domain/constants/groups.tokens';
import type { StudentGroupMembership } from '../domain/interfaces/student-group-membership.interface';
import type { StudentGroup } from '../domain/interfaces/student-group.interface';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  const teacherId = '507f1f77bcf86cd799439011';
  const anotherTeacherId = '507f1f77bcf86cd799439012';
  const studentOneId = '507f1f77bcf86cd799439021';
  const studentTwoId = '507f1f77bcf86cd799439022';
  const groupId = '507f1f77bcf86cd799439031';
  const secondGroupId = '507f1f77bcf86cd799439032';
  const now = new Date('2026-09-16T12:00:00.000Z');

  const group: StudentGroup = {
    id: groupId,
    name: 'Lectores iniciales',
    normalized_name: 'lectores iniciales',
    teacher_id: teacherId,
    status: 'active',
    created_by: teacherId,
    created_at: now,
    updated_at: now,
  };

  const student = (id: string, name: string): User => ({
    id,
    email: `${name.toLowerCase()}@example.test`,
    display_name: name,
    roles: ['student'],
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  const membership = (
    studentId: string,
    targetGroupId = groupId,
  ): StudentGroupMembership => ({
    id: `${studentId.slice(0, 22)}aa`,
    group_id: targetGroupId,
    student_id: studentId,
    added_by: teacherId,
    created_at: now,
  });

  const groupsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMembershipsByGroupIds: jest.fn(),
    findMembershipsByStudentIds: jest.fn(),
    addMemberships: jest.fn(),
    removeMembership: jest.fn(),
    removeMembershipsByGroupId: jest.fn(),
  };
  const usersService = {
    findStudentsByIds: jest.fn(),
    searchStudents: jest.fn(),
    getPublicUserById: jest.fn(),
  };

  let service: GroupsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    groupsRepository.findAll.mockResolvedValue([]);
    groupsRepository.findMembershipsByGroupIds.mockResolvedValue([]);
    groupsRepository.findMembershipsByStudentIds.mockResolvedValue([]);
    groupsRepository.addMemberships.mockResolvedValue(undefined);
    groupsRepository.removeMembershipsByGroupId.mockResolvedValue(undefined);
    usersService.findStudentsByIds.mockResolvedValue([]);
    usersService.searchStudents.mockResolvedValue([]);
    usersService.getPublicUserById.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GROUPS_REPOSITORY, useValue: groupsRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = moduleRef.get(GroupsService);
  });

  it('creates a teacher-owned group and attaches its initial students', async () => {
    const ana = student(studentOneId, 'Ana');
    usersService.findStudentsByIds.mockResolvedValue([ana]);
    groupsRepository.create.mockResolvedValue(group);

    await expect(
      service.create(
        {
          name: '  Lectores   iniciales ',
          description: ' Primer nivel ',
          student_ids: [studentOneId],
        },
        { userId: teacherId, role: 'teacher' },
      ),
    ).resolves.toMatchObject({
      id: groupId,
      teacher_id: teacherId,
      student_ids: [studentOneId],
    });
    expect(groupsRepository.create).toHaveBeenCalledWith({
      name: 'Lectores iniciales',
      normalized_name: 'lectores iniciales',
      description: 'Primer nivel',
      teacher_id: teacherId,
      status: 'active',
      created_by: teacherId,
    });
    expect(groupsRepository.addMemberships).toHaveBeenCalledWith(
      groupId,
      [studentOneId],
      teacherId,
    );
  });

  it('adds valid students as memberships and returns the complete group', async () => {
    groupsRepository.findById.mockResolvedValue(group);
    usersService.findStudentsByIds.mockResolvedValue([
      student(studentOneId, 'Ana'),
      student(studentTwoId, 'Luis'),
    ]);
    groupsRepository.findMembershipsByGroupIds.mockResolvedValue([
      membership(studentOneId),
      membership(studentTwoId),
    ]);

    const result = await service.addMembers(
      groupId,
      { student_ids: [studentOneId, studentTwoId] },
      { userId: teacherId, role: 'teacher' },
    );

    expect(groupsRepository.addMemberships).toHaveBeenCalledWith(
      groupId,
      [studentOneId, studentTwoId],
      teacherId,
    );
    expect(result.student_ids).toEqual([studentOneId, studentTwoId]);
  });

  it('requires an explicit active teacher when an admin creates a group', async () => {
    await expect(
      service.create(
        { name: 'Grupo administrado' },
        { userId: anotherTeacherId, role: 'admin' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    usersService.getPublicUserById.mockResolvedValue({
      id: teacherId,
      email: 'docente@example.test',
      roles: ['teacher'],
      status: 'disabled',
      created_at: now,
      updated_at: now,
    });
    await expect(
      service.create(
        { name: 'Grupo administrado', teacher_id: teacherId },
        { userId: anotherTeacherId, role: 'admin' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(groupsRepository.create).not.toHaveBeenCalled();
  });

  it('allows an admin to assign an active teacher as group owner', async () => {
    usersService.getPublicUserById.mockResolvedValue({
      id: teacherId,
      email: 'docente@example.test',
      roles: ['teacher'],
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    groupsRepository.create.mockResolvedValue(group);

    await service.create(
      { name: group.name, teacher_id: teacherId },
      { userId: anotherTeacherId, role: 'admin' },
    );

    expect(groupsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teacher_id: teacherId,
        created_by: anotherTeacherId,
      }),
    );
  });

  it('finds orphan students without manufacturing a one-student group', async () => {
    usersService.searchStudents.mockResolvedValue([
      student(studentOneId, 'Ana'),
      student(studentTwoId, 'Luis'),
    ]);
    groupsRepository.findMembershipsByStudentIds.mockResolvedValue([
      membership(studentTwoId),
    ]);
    groupsRepository.findAll.mockResolvedValue([group]);

    const result = await service.searchAudience(
      { q: '', unassigned: true, limit: 30 },
      { userId: teacherId, role: 'teacher' },
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        type: 'student',
        id: studentOneId,
        group_ids: [],
        unassigned: true,
      }),
    ]);
    expect(groupsRepository.findMembershipsByStudentIds).toHaveBeenCalledWith(
      [studentOneId, studentTwoId],
      [groupId],
    );
  });

  it('continues paging until it finds unassigned students', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      student(
        `507f1f77bcf86cd79943${index.toString(16).padStart(4, '0')}`,
        `Asignado ${index}`,
      ),
    );
    const orphan = student(studentOneId, 'Huérfano');
    usersService.searchStudents
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([orphan]);
    groupsRepository.findMembershipsByStudentIds
      .mockResolvedValueOnce(
        firstPage.map((candidate) => membership(candidate.id)),
      )
      .mockResolvedValueOnce([]);
    groupsRepository.findAll.mockResolvedValue([group]);

    const result = await service.searchAudience(
      { q: '', unassigned: true, limit: 1 },
      { userId: teacherId, role: 'teacher' },
    );

    expect(result.items).toEqual([
      expect.objectContaining({ id: orphan.id, unassigned: true }),
    ]);
    expect(usersService.searchStudents).toHaveBeenNthCalledWith(1, '', 100, 0);
    expect(usersService.searchStudents).toHaveBeenNthCalledWith(
      2,
      '',
      100,
      100,
    );
  });

  it('maps the active-name unique index violation to a domain conflict', async () => {
    groupsRepository.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create(
        { name: 'Lectores iniciales' },
        { userId: teacherId, role: 'teacher' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deduplicates direct and grouped students while preserving every source', async () => {
    groupsRepository.findByIds.mockResolvedValue([
      group,
      { ...group, id: secondGroupId, name: 'Segundo grupo' },
    ]);
    groupsRepository.findMembershipsByGroupIds.mockResolvedValue([
      membership(studentOneId),
      membership(studentTwoId),
      membership(studentOneId, secondGroupId),
    ]);
    usersService.findStudentsByIds.mockResolvedValue([
      student(studentOneId, 'Ana'),
      student(studentTwoId, 'Luis'),
    ]);

    const result = await service.resolveAudience(
      [groupId, secondGroupId],
      [studentOneId],
      { userId: teacherId, role: 'teacher' },
    );

    expect(result.student_ids).toEqual([studentOneId, studentTwoId]);
    expect(result.students).toEqual([
      {
        student_id: studentOneId,
        sources: [
          { type: 'direct' },
          { type: 'group', group_id: groupId },
          { type: 'group', group_id: secondGroupId },
        ],
      },
      {
        student_id: studentTwoId,
        sources: [{ type: 'group', group_id: groupId }],
      },
    ]);
  });

  it('prevents a teacher from resolving another teacher group', async () => {
    groupsRepository.findByIds.mockResolvedValue([
      { ...group, teacher_id: anotherTeacherId },
    ]);

    await expect(
      service.resolveAudience([groupId], [], {
        userId: teacherId,
        role: 'teacher',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(groupsRepository.findMembershipsByGroupIds).not.toHaveBeenCalled();
  });
});
