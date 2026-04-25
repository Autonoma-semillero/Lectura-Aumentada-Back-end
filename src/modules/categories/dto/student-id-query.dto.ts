import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class StudentIdQueryDto {
  @ApiProperty({
    description: 'Estudiante cuyas tarjetas Doman determinan las temáticas listadas.',
  })
  @IsMongoId()
  student_id!: string;
}
