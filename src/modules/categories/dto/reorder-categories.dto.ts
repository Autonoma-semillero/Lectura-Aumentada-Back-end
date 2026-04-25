import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId, IsOptional } from 'class-validator';

export class ReorderCategoriesDto {
  @ApiPropertyOptional({
    description:
      'ObjectId del padre cuyos hijos se reordenan; omitir para categorías raíz',
  })
  @IsOptional()
  @IsMongoId()
  parent_id?: string;

  @ApiProperty({
    type: [String],
    description: 'IDs de categorías hermanas, en el orden deseado',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ordered_ids!: string[];
}
