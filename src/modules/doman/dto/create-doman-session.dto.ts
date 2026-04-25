import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import type {
  DomanSessionAudioMode,
  DomanSessionMode,
  DomanSessionStatus,
} from '../domain/interfaces/doman-session.interface';

const AUDIO: DomanSessionAudioMode[] = ['auto', 'manual', 'disabled'];
const STATUS: DomanSessionStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
];
const MODE: DomanSessionMode[] = ['manual', 'auto'];

export class CreateDomanSessionDto {
  @ApiProperty()
  @IsMongoId()
  student_id!: string;

  @ApiProperty()
  @IsMongoId()
  daily_plan_id!: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  session_index!: number;

  @ApiProperty({
    description:
      'Debe coincidir con `doman_daily_plans.category_id` del plan (y con el filtro de tarjetas).',
  })
  @IsMongoId()
  category_id!: string;

  @ApiProperty({ minimum: 200, maximum: 10000 })
  @IsInt()
  @Min(200)
  @Max(10000)
  display_ms!: number;

  @ApiProperty({ enum: AUDIO })
  @IsIn(AUDIO)
  audio_mode!: DomanSessionAudioMode;

  @ApiPropertyOptional({ enum: STATUS, default: 'planned' })
  @IsOptional()
  @IsIn(STATUS)
  status?: DomanSessionStatus;

  @ApiPropertyOptional({ enum: MODE })
  @IsOptional()
  @IsIn(MODE)
  mode?: DomanSessionMode;
}
