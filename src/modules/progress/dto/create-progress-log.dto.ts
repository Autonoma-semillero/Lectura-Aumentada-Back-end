import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProgressLogDto {
  @ApiProperty({ description: 'ObjectId del usuario' })
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiPropertyOptional({ description: 'ObjectId de la unidad de aprendizaje' })
  @IsString()
  @IsOptional()
  learning_unit_id?: string;

  @ApiPropertyOptional({ description: 'ObjectId de la sesión de producto/AR' })
  @IsString()
  @IsOptional()
  session_id?: string;

  @ApiProperty({ example: 'marker_detected' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  ts!: Date;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  device?: string;
}
