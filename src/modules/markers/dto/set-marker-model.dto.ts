import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MARKER_MODEL_FORMATS,
  MarkerModelFormat,
} from '../domain/interfaces/marker.interface';

export class SetMarkerModelDto {
  @ApiProperty({
    example: 'https://cdn.example.com/models/gato.glb',
    description:
      'URL del .glb ya alojado. Reemplaza el modelo anterior del marcador.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  model_3d_url!: string;

  @ApiPropertyOptional({ enum: MARKER_MODEL_FORMATS, default: 'glb' })
  @IsOptional()
  @IsIn(MARKER_MODEL_FORMATS)
  model_3d_format?: MarkerModelFormat;
}
