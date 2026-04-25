import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateDomanSessionDto {
  @ApiPropertyOptional({
    description: 'Debe seguir coincidiendo con la temática del plan diario.',
  })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiPropertyOptional({ minimum: 200, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(10000)
  display_ms?: number;

  @ApiPropertyOptional({ enum: AUDIO })
  @IsOptional()
  @IsIn(AUDIO)
  audio_mode?: DomanSessionAudioMode;

  @ApiPropertyOptional({ enum: STATUS })
  @IsOptional()
  @IsIn(STATUS)
  status?: DomanSessionStatus;

  @ApiPropertyOptional({ enum: MODE })
  @IsOptional()
  @IsIn(MODE)
  mode?: DomanSessionMode;
}
