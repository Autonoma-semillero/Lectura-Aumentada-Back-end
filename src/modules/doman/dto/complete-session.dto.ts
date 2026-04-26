import { IsObject, IsOptional, IsString } from 'class-validator';

export class CompleteSessionDto {
  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
