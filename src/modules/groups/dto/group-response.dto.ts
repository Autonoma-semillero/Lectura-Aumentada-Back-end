import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StudentGroupStatus } from '../domain/interfaces/student-group.interface';

export class GroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  normalized_name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  teacher_id!: string;

  @ApiProperty({ enum: ['active', 'archived'] })
  status!: StudentGroupStatus;

  @ApiProperty()
  created_by!: string;

  @ApiProperty({ type: [String] })
  student_ids!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at!: Date;
}
