import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class ListProgressQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ObjectId del usuario' })
  @IsOptional()
  @IsMongoId()
  user_id?: string;
}
