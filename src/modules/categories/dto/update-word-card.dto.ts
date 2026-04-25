import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { WordCardStatus } from '../domain/types/word-card-repository.payloads';

const WORD_CARD_STATUSES: WordCardStatus[] = [
  'new',
  'active',
  'completed',
  'archived',
];

export class UpdateWordCardDto {
  @ApiPropertyOptional({
    description:
      'Si se envía, se normaliza como en alta y se recalcula `initial_letter`.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  word?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  audio_url?: string;

  @ApiPropertyOptional({
    description: 'Cambio de temática; debe existir en `categories`.',
  })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiPropertyOptional({ enum: WORD_CARD_STATUSES })
  @IsOptional()
  @IsIn(WORD_CARD_STATUSES)
  status?: WordCardStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  learning_unit_id?: string;
}
