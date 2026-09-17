import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StudentGroupStatus } from '../domain/interfaces/student-group.interface';

export class StudentAudienceItemDto {
  @ApiProperty({ enum: ['student'] })
  type!: 'student';

  @ApiProperty({ example: 'student:507f1f77bcf86cd799439011' })
  audience_key!: string;

  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  display_name?: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiProperty({ type: [String] })
  group_ids!: string[];

  @ApiProperty()
  unassigned!: boolean;
}

export class GroupAudienceItemDto {
  @ApiProperty({ enum: ['group'] })
  type!: 'group';

  @ApiProperty({ example: 'group:507f1f77bcf86cd799439011' })
  audience_key!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  teacher_id!: string;

  @ApiProperty({ enum: ['active', 'archived'] })
  status!: StudentGroupStatus;

  @ApiProperty({ type: [String] })
  student_ids!: string[];
}

export type AudienceSearchItemDto =
  | StudentAudienceItemDto
  | GroupAudienceItemDto;

export class AudienceSearchResponseDto {
  @ApiProperty({
    oneOf: [
      { $ref: '#/components/schemas/StudentAudienceItemDto' },
      { $ref: '#/components/schemas/GroupAudienceItemDto' },
    ],
  })
  items!: AudienceSearchItemDto[];
}
