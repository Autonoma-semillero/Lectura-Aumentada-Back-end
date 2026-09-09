import { ApiProperty } from '@nestjs/swagger';

export class ArModelOptionResponseDto {
  @ApiProperty()
  learning_unit_id!: string;

  @ApiProperty()
  marker_id!: string;

  @ApiProperty()
  word!: string;

  @ApiProperty({ description: 'URL de un modelo 3D disponible para asociar' })
  model_3d!: string;
}
