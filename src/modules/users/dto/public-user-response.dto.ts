import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Usuario expuesto por API sin `password_hash`. */
export class PublicUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  display_name?: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'pending'] })
  status?: 'active' | 'disabled' | 'pending';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at!: Date;
}
