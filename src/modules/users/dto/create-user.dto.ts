import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiProperty({ description: 'Hash de contraseña ya calculado (no texto plano)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password_hash!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['student'],
    description: 'Roles del usuario; por defecto ["student"] si se omite',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'pending'] })
  @IsOptional()
  @IsIn(['active', 'disabled', 'pending'])
  status?: 'active' | 'disabled' | 'pending';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
