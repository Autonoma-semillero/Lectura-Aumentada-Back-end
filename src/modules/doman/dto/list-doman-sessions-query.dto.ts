import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ListDomanSessionsQueryDto {
  @ApiProperty({
    description: 'Lista sesiones asociadas a este plan diario.',
  })
  @IsMongoId()
  daily_plan_id!: string;
}
