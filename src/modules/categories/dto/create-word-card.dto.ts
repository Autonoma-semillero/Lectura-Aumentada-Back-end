import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
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

export class CreateWordCardDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  student_id!: string;

  @ApiProperty({
    description:
      'Palabra en bruto; se normaliza (trim, espacios, minúsculas) antes de guardar y aplicar `ux_word_cards_student_word`.',
    example: '  Elefante ',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(512)
  word!: string;

  @ApiProperty({
    description: 'URL o ruta del audio asociado a la palabra.',
    example: 'https://cdn.example.com/audio/elefante.mp3',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2048)
  audio_url!: string;

  @ApiProperty({
    description:
      'Temática obligatoria (`categories._id`) para sesiones por temática.',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  category_id!: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  learning_unit_id?: string;

  @ApiPropertyOptional({ enum: WORD_CARD_STATUSES, default: 'new' })
  @IsOptional()
  @IsIn(WORD_CARD_STATUSES)
  status?: WordCardStatus;
}
