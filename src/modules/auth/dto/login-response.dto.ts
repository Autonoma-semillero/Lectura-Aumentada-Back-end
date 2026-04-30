import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionUserResponseDto {
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
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT de acceso (Bearer)' })
  accessToken!: string;

  @ApiProperty({ type: SessionUserResponseDto })
  user!: SessionUserResponseDto;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiPropertyOptional()
  refreshToken?: string;
}
