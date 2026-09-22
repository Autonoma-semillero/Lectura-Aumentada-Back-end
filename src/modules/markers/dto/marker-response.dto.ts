import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MarkerModelFormat,
  MarkerStatus,
} from '../domain/interfaces/marker.interface';
import {
  MARKER_MODEL_FORMATS,
  MARKER_STATUSES,
} from '../domain/interfaces/marker.interface';

export class MarkerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'aula3-gato' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/models/gato.glb' })
  model_3d_url?: string;

  @ApiPropertyOptional({ enum: MARKER_MODEL_FORMATS })
  model_3d_format?: MarkerModelFormat;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  model_3d_updated_at?: Date;

  @ApiProperty({ enum: MARKER_STATUSES })
  status!: MarkerStatus;

  @ApiProperty()
  created_by!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at!: Date;
}
