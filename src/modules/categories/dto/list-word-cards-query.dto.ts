import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class ListWordCardsQueryDto {
  @ApiProperty({
    description: 'ObjectId del estudiante (`doman_word_cards.student_id`)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  student_id!: string;

  @ApiPropertyOptional({
    description:
      'Si se indica, filtra por temática además de estudiante (usa índice `ix_word_cards_student_category`).',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  category_id?: string;
}
