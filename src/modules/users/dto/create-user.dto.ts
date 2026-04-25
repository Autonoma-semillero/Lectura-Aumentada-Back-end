import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email!: string;

  @ApiPropertyOptional()
  display_name?: string;

  @ApiProperty()
  password_hash!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['student'],
    description: 'Roles del usuario; por defecto ["student"] si se omite',
  })
  roles?: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'pending'] })
  status?: 'active' | 'disabled' | 'pending';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}
