import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

const STUDY_PLAN_STATUSES: DomanStudyPlanStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
];
const AUDIO_MODES: DomanSessionAudioMode[] = ['auto', 'manual', 'disabled'];
const SESSION_MODES: DomanSessionMode[] = ['manual', 'auto'];

export class StudyPlanCategoryDto {
  @ApiProperty()
  @IsMongoId()
  category_id!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 5,
    description:
      'Cantidad de tarjetas elegibles que se resolverán por estudiante. Es la regla usada por planes v2.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  target_cards_count?: number;

  @ApiPropertyOptional({
    type: [String],
    deprecated: true,
    description:
      'Selección exacta usada únicamente por planes singleton legacy.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsMongoId({ each: true })
  word_card_ids?: string[];
}

export class StudyPlanLevelDto {
  @ApiPropertyOptional({
    description: 'Se conserva al editar; se genera al crear.',
  })
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty({ example: 'Nivel 1 · reconocimiento' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  order_index!: number;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  end_date!: string;

  @ApiProperty({ type: [StudyPlanCategoryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StudyPlanCategoryDto)
  categories!: StudyPlanCategoryDto[];
}

export class CreateStudyPlanDto {
  @ApiProperty({ example: 'Animales · primer trimestre' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Shorthand compatible para una audiencia de un solo estudiante.',
  })
  @IsOptional()
  @IsMongoId()
  student_id?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Grupos cuya membresía se resolverá y congelará al crear el plan.',
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
      'Estudiantes seleccionados directamente, adicionales a los grupos.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  student_ids?: string[];

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  sessions_per_day?: number;

  @ApiPropertyOptional({ default: 2200, minimum: 200, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(10000)
  display_ms?: number;

  @ApiPropertyOptional({ enum: AUDIO_MODES, default: 'manual' })
  @IsOptional()
  @IsIn(AUDIO_MODES)
  audio_mode?: DomanSessionAudioMode;

  @ApiPropertyOptional({ enum: SESSION_MODES, default: 'auto' })
  @IsOptional()
  @IsIn(SESSION_MODES)
  mode?: DomanSessionMode;

  @ApiPropertyOptional({ enum: STUDY_PLAN_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(STUDY_PLAN_STATUSES)
  status?: DomanStudyPlanStatus;

  @ApiProperty({ type: [StudyPlanLevelDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StudyPlanLevelDto)
  levels!: StudyPlanLevelDto[];
}

export { AUDIO_MODES, SESSION_MODES, STUDY_PLAN_STATUSES };
