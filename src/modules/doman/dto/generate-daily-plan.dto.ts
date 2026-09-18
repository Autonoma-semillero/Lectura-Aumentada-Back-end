import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_DAILY_PLAN_TARGET_CARDS,
  MAX_DAILY_PLAN_TARGET_SESSIONS,
  MAX_DOMAN_DISPLAY_MS,
  MIN_DAILY_PLAN_TARGET_CARDS,
  MIN_DAILY_PLAN_TARGET_SESSIONS,
  MIN_DOMAN_DISPLAY_MS,
} from '../domain/constants/doman-limits.constants';

export class GenerateDailyPlanDto {
  @ApiProperty({ description: 'ObjectId del estudiante' })
  @IsMongoId()
  student_id!: string;

  @ApiPropertyOptional({ description: 'ObjectId de categoría' })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Plan de estudio maestro que origina el día.' })
  @IsOptional()
  @IsMongoId()
  study_plan_id?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  plan_date?: string;

  @ApiPropertyOptional({
    minimum: MIN_DAILY_PLAN_TARGET_CARDS,
    maximum: MAX_DAILY_PLAN_TARGET_CARDS,
  })
  @IsOptional()
  @IsNumber()
  @Min(MIN_DAILY_PLAN_TARGET_CARDS)
  @Max(MAX_DAILY_PLAN_TARGET_CARDS)
  target_cards_count?: number;

  @ApiPropertyOptional({
    minimum: MIN_DAILY_PLAN_TARGET_SESSIONS,
    maximum: MAX_DAILY_PLAN_TARGET_SESSIONS,
  })
  @IsOptional()
  @IsNumber()
  @Min(MIN_DAILY_PLAN_TARGET_SESSIONS)
  @Max(MAX_DAILY_PLAN_TARGET_SESSIONS)
  target_sessions_count?: number;

  @ApiPropertyOptional({
    minimum: MIN_DOMAN_DISPLAY_MS,
    maximum: MAX_DOMAN_DISPLAY_MS,
  })
  @IsOptional()
  @IsNumber()
  @Min(MIN_DOMAN_DISPLAY_MS)
  @Max(MAX_DOMAN_DISPLAY_MS)
  display_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
