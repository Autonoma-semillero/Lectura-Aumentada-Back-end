import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgressLogDto {
  @ApiProperty({ description: 'ObjectId del usuario' })
  user_id!: string;

  @ApiPropertyOptional({ description: 'ObjectId de la unidad de aprendizaje' })
  learning_unit_id?: string;

  @ApiPropertyOptional({ description: 'ObjectId de la sesión de producto/AR' })
  session_id?: string;

  @ApiProperty({ example: 'marker_detected' })
  action!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  ts!: Date;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  device?: string;
}
