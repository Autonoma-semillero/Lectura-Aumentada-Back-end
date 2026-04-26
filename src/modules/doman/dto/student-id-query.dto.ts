import { IsMongoId, IsOptional } from 'class-validator';

export class StudentIdQueryDto {
  @IsMongoId()
  student_id!: string;

  @IsOptional()
  @IsMongoId()
  category_id?: string;
}
