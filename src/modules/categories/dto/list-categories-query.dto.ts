import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtrar hijos de esta categoría; omitir para listar solo raíz (sin parent_id)',
  })
  @IsOptional()
  @IsMongoId()
  parent_id?: string;
}
