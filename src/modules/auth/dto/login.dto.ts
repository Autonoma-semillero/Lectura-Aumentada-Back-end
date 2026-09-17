import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'ana.garcia',
    description: 'Nombre de usuario o correo electrónico.',
  })
  @ValidateIf((dto: LoginDto) => !dto.email)
  @IsString()
  @IsNotEmpty()
  identifier?: string;

  @ApiPropertyOptional({
    example: 'usuario@ejemplo.com',
    deprecated: true,
    description: 'Alias compatible para clientes que todavía envían email.',
  })
  @ValidateIf((dto: LoginDto) => !dto.identifier)
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
