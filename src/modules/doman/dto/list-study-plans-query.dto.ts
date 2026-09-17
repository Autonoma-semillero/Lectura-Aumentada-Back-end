import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import type { DomanStudyPlanStatus } from '../domain/interfaces/doman-study-plan.interface';
import { STUDY_PLAN_STATUSES } from './create-study-plan.dto';

export class ListStudyPlansQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  student_id?: string;

  @ApiPropertyOptional({ enum: STUDY_PLAN_STATUSES })
  @IsOptional()
  @IsIn(STUDY_PLAN_STATUSES)
  status?: DomanStudyPlanStatus;
}
