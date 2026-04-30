import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Referencia para búsqueda por marker (p. ej. query validada en futuros endpoints). */
export class FindAssetByMarkerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  marker_id!: string;
}
