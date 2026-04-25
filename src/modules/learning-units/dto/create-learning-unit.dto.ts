import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLearningUnitDto {
  @ApiProperty()
  word!: string;

  @ApiPropertyOptional({ description: 'ObjectId de categoría' })
  category_id?: string;

  @ApiProperty()
  marker_id!: string;

  @ApiPropertyOptional({ description: 'URL o ruta al modelo 3D' })
  model_3d?: string;

  @ApiPropertyOptional({ description: 'URL o ruta al audio de pronunciación' })
  audio_pronunciacion?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata_accessibility?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'es' })
  language?: string;
}
