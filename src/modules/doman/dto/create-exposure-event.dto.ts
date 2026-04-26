import { IsIn, IsMongoId, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { DomanExposureEventType } from '../domain/interfaces/doman-exposure-log.interface';

export class CreateExposureEventDto {
  @IsOptional()
  @IsMongoId()
  word_card_id?: string;

  @IsIn(['card_shown', 'card_completed', 'card_skipped', 'audio_played', 'session_finished'])
  event_type!: DomanExposureEventType;

  @IsOptional()
  @IsNumber()
  display_ms?: number;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
