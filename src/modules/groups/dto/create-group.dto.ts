import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Lectores iniciales' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Grupo de práctica de primer nivel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Docente propietario. Solo un administrador puede asignar otro propietario.',
  })
  @IsOptional()
  @IsMongoId()
  teacher_id?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Estudiantes que se vinculan al crear el grupo.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  student_ids?: string[];
}
