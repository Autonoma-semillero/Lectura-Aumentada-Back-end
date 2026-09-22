import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_DAILY_PLAN_TARGET_CARDS,
  MIN_DAILY_PLAN_TARGET_CARDS,
} from '../domain/constants/doman-limits.constants';

export class PreviewCategoryCardsDto {
  @ApiProperty()
  @IsMongoId()
  category_id!: string;

  @ApiPropertyOptional({
    minimum: MIN_DAILY_PLAN_TARGET_CARDS,
    maximum: MAX_DAILY_PLAN_TARGET_CARDS,
    description:
      'Cantidad de tarjetas elegibles que se resolverán por estudiante. Mutuamente excluyente con word_card_words.',
  })
  @IsOptional()
  @IsInt()
  @Min(MIN_DAILY_PLAN_TARGET_CARDS)
  @Max(MAX_DAILY_PLAN_TARGET_CARDS)
  target_cards_count?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Selección explícita de palabras a previsualizar por estudiante, sin persistir nada.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(60, { each: true })
  word_card_words?: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsMongoId({ each: true })
  student_ids!: string[];
}
