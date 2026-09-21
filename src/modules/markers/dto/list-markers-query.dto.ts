import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MARKER_STATUSES,
  MarkerStatus,
} from '../domain/interfaces/marker.interface';
import { MAX_MARKER_CODE_LENGTH } from '../domain/types/marker-code-normalization';

export class ListMarkersQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por coincidencia en el código.' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MARKER_CODE_LENGTH)
  q?: string;

  @ApiPropertyOptional({ enum: MARKER_STATUSES })
  @IsOptional()
  @IsIn(MARKER_STATUSES)
  status?: MarkerStatus;

  @ApiPropertyOptional({
    description: 'true = solo marcadores con modelo 3D; false = solo sin él.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  with_model?: boolean;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
