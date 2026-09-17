import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { StudentGroupStatus } from '../domain/interfaces/student-group.interface';

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Lectores avanzados' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: StudentGroupStatus;
}
