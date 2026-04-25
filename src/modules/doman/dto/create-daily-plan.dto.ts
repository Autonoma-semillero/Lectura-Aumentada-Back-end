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

  @ApiProperty({ minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  target_cards_count!: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
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
