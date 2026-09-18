import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_DAILY_PLAN_TARGET_CARDS,
  MAX_DAILY_PLAN_TARGET_SESSIONS,
  MIN_DAILY_PLAN_TARGET_CARDS,
  MIN_DAILY_PLAN_TARGET_SESSIONS,
} from '../domain/constants/doman-limits.constants';

export class CreateDailyPlanDto {
  @ApiProperty()
  @IsMongoId()
  student_id!: string;

  @ApiProperty({
    description: 'Fecha del plan (ISO); se normaliza al inicio del día UTC.',
    example: '2026-04-24',
  })
  @IsDateString()
  plan_date!: string;

  @ApiProperty({
    minimum: MIN_DAILY_PLAN_TARGET_CARDS,
    maximum: MAX_DAILY_PLAN_TARGET_CARDS,
  })
  @IsInt()
  @Min(MIN_DAILY_PLAN_TARGET_CARDS)
  @Max(MAX_DAILY_PLAN_TARGET_CARDS)
  target_cards_count!: number;

  @ApiProperty({
    minimum: MIN_DAILY_PLAN_TARGET_SESSIONS,
    maximum: MAX_DAILY_PLAN_TARGET_SESSIONS,
  })
  @IsInt()
  @Min(MIN_DAILY_PLAN_TARGET_SESSIONS)
  @Max(MAX_DAILY_PLAN_TARGET_SESSIONS)
  target_sessions_count!: number;

  @ApiProperty({
    description:
      'Temática activa; mismo criterio que `doman_word_cards.category_id`.',
  })
  @IsMongoId()
  category_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  algorithm_version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
