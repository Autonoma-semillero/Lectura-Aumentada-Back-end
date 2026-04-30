import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { DomanExposureEventType } from '../domain/interfaces/doman-exposure-log.interface';

export class CreateExposureEventDto {
  @ApiPropertyOptional({ description: 'ObjectId de tarjeta de palabra' })
  @IsOptional()
  @IsMongoId()
  word_card_id?: string;

  @ApiProperty({
    enum: [
      'card_shown',
      'card_completed',
      'card_skipped',
      'audio_played',
      'session_finished',
      'session_completed',
    ],
  })
  @IsIn([
    'card_shown',
    'card_completed',
    'card_skipped',
    'audio_played',
    'session_finished',
    'session_completed',
  ])
  event_type!: DomanExposureEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  display_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
