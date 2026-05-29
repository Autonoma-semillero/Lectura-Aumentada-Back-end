import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DOCENTE_REPOSITORY } from '../domain/constants/docente.tokens';
import type { IDocenteRepository } from '../domain/interfaces/docente.repository.interface';
import { CompletedCardsQueryDto } from '../dto/student-progress-query.dto';
import { DocenteService } from './docente.service';

const VALID_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const INVALID_ID = 'not-valid';

const mockRepo = (): jest.Mocked<IDocenteRepository> => ({
  studentExists: jest.fn(),
  getStudentProgressByCategory: jest.fn(),
  getCompletedCards: jest.fn(),
  listStudents: jest.fn(),
});

describe('DocenteService', () => {
  let service: DocenteService;
  let repo: jest.Mocked<IDocenteRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocenteService,
        { provide: DOCENTE_REPOSITORY, useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(DocenteService);
    repo = module.get(DOCENTE_REPOSITORY);
  });

  describe('getStudentProgressByCategory', () => {
    it('throws BadRequestException for invalid ObjectId', async () => {
      await expect(service.getStudentProgressByCategory(INVALID_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when student not found', async () => {
      repo.studentExists.mockResolvedValue(false);
      await expect(service.getStudentProgressByCategory(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns progress array when student exists', async () => {
      const progress = [
        {
          categoryId: VALID_ID,
          categoryName: 'Cocina',
          categorySlug: 'cocina',
          total: 5,
          byStatus: { new: 2, active: 2, completed: 1, archived: 0 },
          phase2Ready: false,
        },
      ];
      repo.studentExists.mockResolvedValue(true);
      repo.getStudentProgressByCategory.mockResolvedValue(progress);

      const result = await service.getStudentProgressByCategory(VALID_ID);

      expect(repo.getStudentProgressByCategory).toHaveBeenCalledWith(VALID_ID);
      expect(result).toEqual(progress);
    });

    it('returns empty array when student has no cards', async () => {
      repo.studentExists.mockResolvedValue(true);
      repo.getStudentProgressByCategory.mockResolvedValue([]);

      const result = await service.getStudentProgressByCategory(VALID_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getCompletedCards', () => {
    it('throws BadRequestException for invalid studentId', async () => {
      const query: CompletedCardsQueryDto = {};
      await expect(service.getCompletedCards(INVALID_ID, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when student not found', async () => {
      repo.studentExists.mockResolvedValue(false);
      await expect(service.getCompletedCards(VALID_ID, {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid categoryId', async () => {
      repo.studentExists.mockResolvedValue(true);
      const query: CompletedCardsQueryDto = { categoryId: 'bad-id' };
      await expect(service.getCompletedCards(VALID_ID, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('calls repository with default pagination when no query params', async () => {
      repo.studentExists.mockResolvedValue(true);
      repo.getCompletedCards.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getCompletedCards(VALID_ID, {});

      expect(repo.getCompletedCards).toHaveBeenCalledWith({
        studentId: VALID_ID,
        categoryId: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('forwards categoryId filter to repository', async () => {
      repo.studentExists.mockResolvedValue(true);
      repo.getCompletedCards.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      const query: CompletedCardsQueryDto = { categoryId: VALID_ID, page: 2, limit: 10 };
      await service.getCompletedCards(VALID_ID, query);

      expect(repo.getCompletedCards).toHaveBeenCalledWith({
        studentId: VALID_ID,
        categoryId: VALID_ID,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('listStudents', () => {
    it('returns all students from repository', async () => {
      const students = [
        { id: VALID_ID, email: 'juan@test.com', displayName: 'Juan' },
      ];
      repo.listStudents.mockResolvedValue(students);

      const result = await service.listStudents();
      expect(result).toEqual(students);
    });

    it('returns empty array when no students exist', async () => {
      repo.listStudents.mockResolvedValue([]);
      const result = await service.listStudents();
      expect(result).toEqual([]);
    });
  });
});
