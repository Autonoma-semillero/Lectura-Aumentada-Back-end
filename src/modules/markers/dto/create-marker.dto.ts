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
  MARKER_STATUSES,
  MarkerModelFormat,
  MarkerStatus,
} from '../domain/interfaces/marker.interface';
import { MAX_MARKER_CODE_LENGTH } from '../domain/types/marker-code-normalization';

export class CreateMarkerDto {
  @ApiProperty({
    example: 'aula3-gato',
    description:
      'Código que emite el motor AR. Se normaliza (sin tildes, minúsculas, espacios a guiones) y es inmutable tras la creación.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MARKER_CODE_LENGTH)
  code!: string;

  @ApiProperty({ example: 'Marcador Gato' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/models/gato.glb',
    description:
      'URL del .glb ya alojado. No hay subida de archivo: el binario vive en CDN o servidor de archivos (README §7.3).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  model_3d_url?: string;

  @ApiPropertyOptional({ enum: MARKER_MODEL_FORMATS, default: 'glb' })
  @IsOptional()
  @IsIn(MARKER_MODEL_FORMATS)
  model_3d_format?: MarkerModelFormat;

  @ApiPropertyOptional({ enum: MARKER_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(MARKER_STATUSES)
  status?: MarkerStatus;
}
