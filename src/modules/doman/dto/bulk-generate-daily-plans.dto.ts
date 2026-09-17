import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class BulkGenerateDailyPlansDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Grupos cuya membresía se resolverá al crear la asignación. La unión final admite máximo 50 estudiantes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  group_ids?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Estudiantes agregados directamente. La unión final con grupos admite máximo 50 estudiantes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  student_ids?: string[];

  @ApiPropertyOptional({ description: 'Categoría común para la asignación.' })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  plan_date?: string;

  @ApiPropertyOptional({ minimum: 3, maximum: 8 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(8)
  target_cards_count?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  target_sessions_count?: number;

  @ApiPropertyOptional({ minimum: 800, maximum: 6000 })
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(6000)
  display_ms?: number;

  @ApiPropertyOptional({
    description:
      'Debe omitirse o enviarse en false. La generación masiva rechaza force=true.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
