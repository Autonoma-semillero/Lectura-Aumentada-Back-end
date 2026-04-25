import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class ListDailyPlansQueryDto {
  @ApiProperty()
  @IsMongoId()
  student_id!: string;

  @ApiPropertyOptional({
    description: 'Inicio del rango (ISO fecha); inicio del día UTC.',
    example: '2026-04-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin del rango (ISO fecha); inicio del día UTC inclusive.',
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
