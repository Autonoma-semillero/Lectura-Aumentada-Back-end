import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MARKER_STATUSES,
  MarkerStatus,
} from '../domain/interfaces/marker.interface';

/**
 * `code` no se expone a propósito: es la clave natural que ya circula en los
 * clientes AR. Con `forbidNonWhitelisted: true` enviarlo devuelve 400.
 * El modelo 3D se gestiona en `PUT|DELETE /api/markers/:id/model`.
 */
export class UpdateMarkerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: MARKER_STATUSES })
  @IsOptional()
  @IsIn(MARKER_STATUSES)
  status?: MarkerStatus;
}
