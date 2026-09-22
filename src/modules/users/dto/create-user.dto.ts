import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UserRole } from '../domain/interfaces/user.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'ana.garcia',
    description: 'Nombre único para iniciar sesión, sin espacios.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiProperty({
    format: 'password',
    description: 'Contraseña que el backend almacena como hash seguro.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['student'],
    description: 'Roles del usuario; por defecto ["student"] si se omite',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1)
  @IsIn(['student', 'teacher'], { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'pending'] })
  @IsOptional()
  @IsIn(['active', 'disabled', 'pending'])
  status?: 'active' | 'disabled' | 'pending';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
