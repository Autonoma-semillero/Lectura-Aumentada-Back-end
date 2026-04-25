import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProgressQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ObjectId del usuario' })
  user_id?: string;
}
