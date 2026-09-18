import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { DomanStudyPlanStatus } from '../domain/interfaces/doman-study-plan.interface';
import type {
  DomanSessionAudioMode,
  DomanSessionMode,
} from '../domain/interfaces/doman-session.interface';
import {
  AUDIO_MODES,
  SESSION_MODES,
  STUDY_PLAN_STATUSES,
  StudyPlanLevelDto,
} from './create-study-plan.dto';
import {
  MAX_DAILY_PLAN_TARGET_SESSIONS,
  MAX_DOMAN_DISPLAY_MS,
  MIN_DAILY_PLAN_TARGET_SESSIONS,
  MIN_DOMAN_DISPLAY_MS,
} from '../domain/constants/doman-limits.constants';

export class UpdateStudyPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description:
      'La audiencia es inmutable; enviar este campo produce Bad Request.',
  })
  @IsOptional()
  @IsMongoId()
  student_id?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'La audiencia es inmutable; este campo solo permite devolver un error de contrato explícito.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  group_ids?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'La audiencia es inmutable; este campo solo permite devolver un error de contrato explícito.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  student_ids?: string[];

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    minimum: MIN_DAILY_PLAN_TARGET_SESSIONS,
    maximum: MAX_DAILY_PLAN_TARGET_SESSIONS,
  })
  @IsOptional()
  @IsInt()
  @Min(MIN_DAILY_PLAN_TARGET_SESSIONS)
  @Max(MAX_DAILY_PLAN_TARGET_SESSIONS)
  sessions_per_day?: number;

  @ApiPropertyOptional({
    minimum: MIN_DOMAN_DISPLAY_MS,
    maximum: MAX_DOMAN_DISPLAY_MS,
  })
  @IsOptional()
  @IsInt()
  @Min(MIN_DOMAN_DISPLAY_MS)
  @Max(MAX_DOMAN_DISPLAY_MS)
  display_ms?: number;

  @ApiPropertyOptional({ enum: AUDIO_MODES })
  @IsOptional()
  @IsIn(AUDIO_MODES)
  audio_mode?: DomanSessionAudioMode;

  @ApiPropertyOptional({ enum: SESSION_MODES })
  @IsOptional()
  @IsIn(SESSION_MODES)
  mode?: DomanSessionMode;

  @ApiPropertyOptional({ enum: STUDY_PLAN_STATUSES })
  @IsOptional()
  @IsIn(STUDY_PLAN_STATUSES)
  status?: DomanStudyPlanStatus;

  @ApiPropertyOptional({ type: [StudyPlanLevelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StudyPlanLevelDto)
  levels?: StudyPlanLevelDto[];
}
