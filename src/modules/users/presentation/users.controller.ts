import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import { User } from '../domain/interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<unknown> {
    return (await this.usersService.findAll()).map(toPublicUser);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<unknown> {
    const user = await this.usersService.findById(id);
    return user ? toPublicUser(user) : null;
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<unknown> {
    return toPublicUser(await this.usersService.create(dto));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<unknown> {
    const user = await this.usersService.update(id, dto);
    return user ? toPublicUser(user) : null;
  }
}

function toPublicUser(user: User): Omit<User, 'password_hash'> {
  const { password_hash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
