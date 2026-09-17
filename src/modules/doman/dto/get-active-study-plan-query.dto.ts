import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class GetActiveStudyPlanQueryDto {
  @ApiProperty({ description: 'ObjectId del estudiante' })
  @IsMongoId()
  student_id!: string;

  @ApiPropertyOptional({
    description: 'Fecha calendario del plan; hoy en Bogotá si se omite.',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
