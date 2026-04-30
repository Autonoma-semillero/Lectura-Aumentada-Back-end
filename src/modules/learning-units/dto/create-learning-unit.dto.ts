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

export class CreateLearningUnitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  word!: string;

  @ApiPropertyOptional({ description: 'ObjectId de categoría' })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  marker_id!: string;

  @ApiPropertyOptional({ description: 'URL o ruta al modelo 3D' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  model_3d?: string;

  @ApiPropertyOptional({ description: 'URL o ruta al audio de pronunciación' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  audio_pronunciacion?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata_accessibility?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;
}
