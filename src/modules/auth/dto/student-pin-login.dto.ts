import { IsString, Matches } from 'class-validator';

export class StudentPinLoginDto {
  @IsString()
  @Matches(/^\d{4,6}$/)
  pin!: string;
}
