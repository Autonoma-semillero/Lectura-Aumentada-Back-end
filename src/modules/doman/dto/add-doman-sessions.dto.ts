import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type {
  DomanSessionAudioMode,
  DomanSessionMode,
} from '../domain/interfaces/doman-session.interface';

export class AddDomanSessionsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional({ minimum: 200, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(10000)
  display_ms?: number;

  @ApiPropertyOptional({ enum: ['auto', 'manual', 'disabled'] })
  @IsOptional()
  @IsIn(['auto', 'manual', 'disabled'])
  audio_mode?: DomanSessionAudioMode;

  @ApiPropertyOptional({ enum: ['manual', 'auto'] })
  @IsOptional()
  @IsIn(['manual', 'auto'])
  mode?: DomanSessionMode;
}
