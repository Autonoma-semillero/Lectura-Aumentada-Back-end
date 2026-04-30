import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { PublicUserResponseDto } from '../dto/public-user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<PublicUserResponseDto[]> {
    return this.usersService.listPublicUsers();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<PublicUserResponseDto | null> {
    return this.usersService.getPublicUserById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<PublicUserResponseDto> {
    return this.usersService.createPublic(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUserResponseDto | null> {
    return this.usersService.updatePublic(id, dto);
  }
}
