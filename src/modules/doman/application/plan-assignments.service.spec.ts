import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GroupsService } from '../../groups/application/groups.service';
import { PLAN_ASSIGNMENTS_REPOSITORY } from '../domain/constants/doman.tokens';
import { DailyPlansService } from './daily-plans.service';
import { PlanAssignmentsService } from './plan-assignments.service';

describe('PlanAssignmentsService', () => {
  const teacherId = '507f1f77bcf86cd799439001';
  const groupId = '507f1f77bcf86cd799439002';
  const firstStudentId = '507f1f77bcf86cd799439011';
  const secondStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const assignmentId = '507f1f77bcf86cd799439031';
  const requester = { userId: teacherId, role: 'teacher' as const };

  const assignmentsRepository = {
    create: jest.fn(),
    complete: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
  };
  const groupsService = {
    resolveAudience: jest.fn(),
  };
  const dailyPlansService = {
    generateForAssignment: jest.fn(),
  };

  let service: PlanAssignmentsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanAssignmentsService,
        {
          provide: PLAN_ASSIGNMENTS_REPOSITORY,
          useValue: assignmentsRepository,
        },
        { provide: GroupsService, useValue: groupsService },
        { provide: DailyPlansService, useValue: dailyPlansService },
      ],
    }).compile();
    service = moduleRef.get(PlanAssignmentsService);
  });

  it('rechaza una audiencia vacía antes de crear la asignación', async () => {
    await expect(service.generate({}, requester)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(groupsService.resolveAudience).not.toHaveBeenCalled();
    expect(assignmentsRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza force=true antes de resolver o persistir la audiencia', async () => {
    await expect(
      service.generate({ group_ids: [groupId], force: true }, requester),
    ).rejects.toThrow('force=true is not supported');
    expect(groupsService.resolveAudience).not.toHaveBeenCalled();
    expect(assignmentsRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza audiencias resueltas de más de cincuenta estudiantes', async () => {
    const students = Array.from({ length: 51 }, (_, index) => ({
      student_id: `507f1f77bcf86cd79943${index.toString(16).padStart(4, '0')}`,
      sources: [{ type: 'group' as const, group_id: groupId }],
    }));
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: students.map((student) => student.student_id),
      students,
    });

    await expect(
      service.generate({ group_ids: [groupId] }, requester),
    ).rejects.toThrow('cannot exceed 50 students');
    expect(assignmentsRepository.create).not.toHaveBeenCalled();
    expect(dailyPlansService.generateForAssignment).not.toHaveBeenCalled();
  });

  it('persiste la audiencia deduplicada y devuelve resultados parciales', async () => {
    const students = [
      {
        student_id: firstStudentId,
        sources: [
          { type: 'group' as const, group_id: groupId },
          { type: 'direct' as const },
        ],
      },
      {
        student_id: secondStudentId,
        sources: [{ type: 'group' as const, group_id: groupId }],
      },
    ];
    groupsService.resolveAudience.mockResolvedValue({
      student_ids: [firstStudentId, secondStudentId],
      students,
    });
    assignmentsRepository.create.mockResolvedValue(
      buildAssignment('processing', students),
    );
    assignmentsRepository.complete.mockImplementation(
      async (_id: string, payload: { status: string; summary: unknown }) => ({
        ...buildAssignment(payload.status, students),
        summary: payload.summary,
      }),
    );
    dailyPlansService.generateForAssignment
      .mockResolvedValueOnce({
        status: 'generated',
        plan: {
          plan: { id: '507f1f77bcf86cd799439041' },
          cards_count: 3,
          cards: [],
          sessions_count: 1,
          completed_sessions_count: 0,
          pending_sessions_count: 1,
          next_session_id: null,
        },
      })
      .mockRejectedValueOnce(
        new BadRequestException('No available word cards'),
      );

    const response = (await service.generate(
      {
        group_ids: [groupId],
        student_ids: [firstStudentId],
        category_id: categoryId,
      },
      requester,
    )) as {
      summary: {
        total: number;
        generated: number;
        existing: number;
        failed: number;
      };
      results: Array<{ student_id: string; status: string; error?: string }>;
    };

    expect(groupsService.resolveAudience).toHaveBeenCalledWith(
      [groupId],
      [firstStudentId],
      requester,
    );
    expect(assignmentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        groupIds: [groupId],
        directStudentIds: [firstStudentId],
        students,
        categoryId,
      }),
    );
    expect(response.summary).toEqual({
      total: 2,
      generated: 1,
      existing: 0,
      failed: 1,
    });
    expect(response.results[1]).toMatchObject({
      student_id: secondStudentId,
      status: 'failed',
      error: 'No available word cards',
    });
    expect(assignmentsRepository.complete).toHaveBeenCalledWith(
      assignmentId,
      expect.objectContaining({ status: 'partial' }),
    );
  });

  function buildAssignment(status: string, students: unknown[]) {
    const now = new Date('2026-09-16T12:00:00.000Z');
    return {
      id: assignmentId,
      group_ids: [groupId],
      direct_student_ids: [firstStudentId],
      student_ids: [firstStudentId, secondStudentId],
      students,
      category_id: categoryId,
      plan_date: now,
      force: false,
      status,
      summary: { total: 2, generated: 0, existing: 0, failed: 0 },
      results: [],
      created_by: teacherId,
      created_at: now,
      updated_at: now,
    };
  }
});
