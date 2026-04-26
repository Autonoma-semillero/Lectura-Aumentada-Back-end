import { IsBoolean, IsMongoId, IsNumber, IsOptional } from 'class-validator';

export class GenerateDailyPlanDto {
  @IsMongoId()
  student_id!: string;

  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @IsOptional()
  @IsNumber()
  target_cards_count?: number;

  @IsOptional()
  @IsNumber()
  target_sessions_count?: number;

  @IsOptional()
  @IsNumber()
  display_ms?: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
