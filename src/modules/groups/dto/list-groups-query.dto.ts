import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { StudentGroupStatus } from '../domain/interfaces/student-group.interface';

export class ListGroupsQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre normalizado.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: StudentGroupStatus;
}
