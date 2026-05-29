import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DocenteService } from '../application/docente.service';
import { CompletedCardsQueryDto } from '../dto/student-progress-query.dto';

@ApiTags('docente')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('teacher')
@Controller('docente')
export class DocenteController {
  constructor(private readonly docenteService: DocenteService) {}

  @Get('students')
  @ApiOperation({ summary: 'Lista de estudiantes disponibles para el docente' })
  @ApiOkResponse({ description: 'Lista de estudiantes con rol student' })
  async listStudents(): Promise<unknown> {
    return this.docenteService.listStudents();
  }

  @Get('students/:studentId/progress')
  @ApiOperation({ summary: 'Resumen de progreso del estudiante por temática' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante (MongoDB ObjectId)' })
  @ApiOkResponse({ description: 'Array de progreso por categoría' })
  @ApiNotFoundResponse({ description: 'Estudiante no encontrado' })
  async getStudentProgress(@Param('studentId') studentId: string): Promise<unknown> {
    return this.docenteService.getStudentProgressByCategory(studentId);
  }

  @Get('students/:studentId/cards/completed')
  @ApiOperation({ summary: 'Tarjetas dominadas por el estudiante con paginación' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante (MongoDB ObjectId)' })
  @ApiOkResponse({ description: 'Lista paginada de tarjetas con status completed' })
  @ApiNotFoundResponse({ description: 'Estudiante no encontrado' })
  @ApiForbiddenResponse({ description: 'El token no corresponde a un docente' })
  async getCompletedCards(
    @Param('studentId') studentId: string,
    @Query() query: CompletedCardsQueryDto,
  ): Promise<unknown> {
    return this.docenteService.getCompletedCards(studentId, query);
  }
}
