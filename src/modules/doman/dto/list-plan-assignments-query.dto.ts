import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPlanAssignmentsQueryDto {
  @ApiPropertyOptional({
    enum: ['processing', 'completed', 'partial', 'failed'],
  })
  @IsOptional()
  @IsIn(['processing', 'completed', 'partial', 'failed'])
  status?: 'processing' | 'completed' | 'partial' | 'failed';

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
