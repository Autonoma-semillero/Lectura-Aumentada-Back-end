import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  display_name?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  password_hash?: string;

  @ApiPropertyOptional({ type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'pending'] })
  status?: 'active' | 'disabled' | 'pending';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}
