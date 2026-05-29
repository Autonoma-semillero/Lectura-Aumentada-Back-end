import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { DOCENTE_REPOSITORY } from '../domain/constants/docente.tokens';
import type {
  CategoryProgressSummary,
  CompletedCardsPaginated,
  StudentSummary,
} from '../domain/interfaces/docente-progress.interface';
import type { IDocenteRepository } from '../domain/interfaces/docente.repository.interface';
import { CompletedCardsQueryDto } from '../dto/student-progress-query.dto';

@Injectable()
export class DocenteService {
  constructor(
    @Inject(DOCENTE_REPOSITORY)
    private readonly docenteRepository: IDocenteRepository,
  ) {}

  async getStudentProgressByCategory(studentId: string): Promise<CategoryProgressSummary[]> {
    await this.validateStudentId(studentId);
    return this.docenteRepository.getStudentProgressByCategory(studentId);
  }

  async getCompletedCards(
    studentId: string,
    query: CompletedCardsQueryDto,
  ): Promise<CompletedCardsPaginated> {
    await this.validateStudentId(studentId);
    if (query.categoryId && !isMongoObjectId(query.categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }
    return this.docenteRepository.getCompletedCards({
      studentId,
      categoryId: query.categoryId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  async listStudents(): Promise<StudentSummary[]> {
    return this.docenteRepository.listStudents();
  }

  private async validateStudentId(studentId: string): Promise<void> {
    if (!isMongoObjectId(studentId)) {
      throw new BadRequestException('Invalid studentId');
    }
    const exists = await this.docenteRepository.studentExists(studentId);
    if (!exists) {
      throw new NotFoundException('Student not found');
    }
  }
}
