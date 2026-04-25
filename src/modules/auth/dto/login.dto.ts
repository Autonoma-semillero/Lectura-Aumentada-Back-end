import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email!: string;

  @ApiProperty({ example: '********' })
  password!: string;
}
