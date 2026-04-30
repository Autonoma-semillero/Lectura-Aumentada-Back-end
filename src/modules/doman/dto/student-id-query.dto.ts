import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class StudentIdQueryDto {
  @ApiProperty({ description: 'ObjectId del estudiante' })
  @IsMongoId()
  student_id!: string;

  @ApiPropertyOptional({ description: 'ObjectId de categoría' })
  @IsOptional()
  @IsMongoId()
  category_id?: string;
}
