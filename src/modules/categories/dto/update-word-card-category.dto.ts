import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class UpdateWordCardCategoryDto {
  @ApiProperty({
    description:
      'ObjectId de `categories` (temática). Obligatorio: no se permite quitar `category_id` (sesiones por temática).',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  category_id!: string;
}
