import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Actualización de rutas de activos sobre una `learning_unit` existente.
 * La persistencia real debe actualizar el documento en `learning_units`, no una colección aparte.
 */
export class CreateAssetDto {
  @ApiProperty({ description: 'ObjectId de la learning unit' })
  learning_unit_id!: string;

  @ApiPropertyOptional({ description: 'Si se omite, se toma de la unidad' })
  marker_id?: string;

  @ApiPropertyOptional()
  model_3d?: string;

  @ApiPropertyOptional()
  audio_pronunciacion?: string;

  @ApiPropertyOptional()
  language?: string;
}
