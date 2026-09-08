import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  learning_unit_id!: string;

  @ApiProperty()
  marker_id!: string;

  @ApiProperty()
  word!: string;

  @ApiPropertyOptional({ description: 'URL absoluta o ruta pública del modelo GLB' })
  model_3d?: string;

  @ApiPropertyOptional({ description: 'URL absoluta o ruta pública del audio contextual' })
  audio_pronunciacion?: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional({ type: Object })
  metadata_accessibility?: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at!: Date;
}
