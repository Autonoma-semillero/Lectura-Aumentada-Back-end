import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLearningUnitDto {
  @ApiPropertyOptional()
  word?: string;

  @ApiPropertyOptional()
  category_id?: string;

  @ApiPropertyOptional()
  marker_id?: string;

  @ApiPropertyOptional()
  model_3d?: string;

  @ApiPropertyOptional()
  audio_pronunciacion?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata_accessibility?: Record<string, unknown>;

  @ApiPropertyOptional()
  language?: string;
}
