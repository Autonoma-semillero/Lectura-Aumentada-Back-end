import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsMongoId, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLiveCardDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) word!: string;
  @ApiProperty() @IsMongoId() category_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2048) audio_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() learning_unit_id?: string;
  @ApiPropertyOptional({ enum: ['owner_only', 'shared'] }) @IsOptional() @IsIn(['owner_only', 'shared']) sharing_scope?: 'owner_only' | 'shared';
}

export class UpdateLiveCardDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) word?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() category_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2048) audio_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) language?: string;
  @ApiPropertyOptional({ enum: ['owner_only', 'shared'] }) @IsOptional() @IsIn(['owner_only', 'shared']) sharing_scope?: 'owner_only' | 'shared';
  @ApiPropertyOptional({ enum: ['active', 'archived'] }) @IsOptional() @IsIn(['active', 'archived']) status?: 'active' | 'archived';
}

export class CreateRepertoireDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty() @IsMongoId() category_id!: string;
  @ApiProperty({ enum: ['single_words', 'couplets', 'sentences', 'books'] }) @IsIn(['single_words', 'couplets', 'sentences', 'books']) stage!: 'single_words' | 'couplets' | 'sentences' | 'books';
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsMongoId({ each: true }) card_ids!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional({ enum: ['teacher_controlled', 'timed'] }) @IsOptional() @IsIn(['teacher_controlled', 'timed']) default_pacing?: 'teacher_controlled' | 'timed';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(500) @Max(10000) default_display_ms?: number;
  @ApiPropertyOptional({ enum: ['teacher_voice', 'optional_recording', 'disabled'] }) @IsOptional() @IsIn(['teacher_voice', 'optional_recording', 'disabled']) audio_policy?: 'teacher_voice' | 'optional_recording' | 'disabled';
}

export class CreateLiveSessionDto {
  @ApiProperty() @IsMongoId() group_id!: string;
  @ApiProperty() @IsMongoId() repertoire_id!: string;
  @ApiPropertyOptional({ enum: ['teacher_controlled', 'timed'] }) @IsOptional() @IsIn(['teacher_controlled', 'timed']) pacing?: 'teacher_controlled' | 'timed';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(500) @Max(10000) display_ms?: number;
}

export class LiveSessionCommandDto {
  @ApiProperty({ enum: ['start', 'next', 'repeat', 'pause', 'resume', 'end', 'cancel'] }) @IsIn(['start', 'next', 'repeat', 'pause', 'resume', 'end', 'cancel']) action!: 'start' | 'next' | 'repeat' | 'pause' | 'resume' | 'end' | 'cancel';
  @ApiProperty() @IsInt() @Min(0) expected_sequence!: number;
  @ApiProperty() @IsUUID() command_id!: string;
}

export class AcknowledgeLiveSessionDto {
  @ApiProperty() @IsInt() @Min(1) sequence!: number;
}

export class CreateLiveObservationDto {
  @ApiProperty() @IsMongoId() student_id!: string;
  @ApiProperty({ enum: ['engagement', 'attention', 'observed_response', 'follow_up'] }) @IsIn(['engagement', 'attention', 'observed_response', 'follow_up']) kind!: 'engagement' | 'attention' | 'observed_response' | 'follow_up';
  @ApiProperty({ enum: ['observed', 'not_observed', 'needs_follow_up'] }) @IsIn(['observed', 'not_observed', 'needs_follow_up']) value!: 'observed' | 'not_observed' | 'needs_follow_up';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
