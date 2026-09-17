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

  @ApiPropertyOptional({ minimum: 3, maximum: 8 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(8)
  target_cards_count?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  target_sessions_count?: number;

  @ApiPropertyOptional({ minimum: 800, maximum: 6000 })
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(6000)
  display_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
