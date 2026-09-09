import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { MAX_ASSET_WORD_LENGTH } from '../domain/types/asset-word-normalization';

export class FindAssetByWordDto {
  @ApiProperty({
    description:
      'Palabra detectada por OCR; no distingue mayúsculas ni tildes y tolera una única edición en palabras de al menos 3 caracteres cuando no hay coincidencia exacta',
    example: 'Árbol',
    maxLength: MAX_ASSET_WORD_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ASSET_WORD_LENGTH)
  @Matches(
    /^\s*[\p{Letter}\p{Mark}\p{Number}]+(?:(?:\s+|['-])[\p{Letter}\p{Mark}\p{Number}]+)*\s*$/u,
    {
      message:
        'word must contain only letters, numbers, spaces, apostrophes or hyphens',
    },
  )
  word!: string;
}
