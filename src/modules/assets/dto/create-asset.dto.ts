import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Actualización de rutas de activos sobre una `learning_unit` existente.
 * La persistencia real debe actualizar el documento en `learning_units`, no una colección aparte.
 */
export class CreateAssetDto {
  @ApiProperty({ description: 'ObjectId de la learning unit' })
  @IsMongoId()
  @IsNotEmpty()
  learning_unit_id!: string;

  @ApiPropertyOptional({ description: 'Si se omite, se mantiene el marker_id de la unidad' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  marker_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  model_3d?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  audio_pronunciacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata_accessibility?: Record<string, unknown>;
}
