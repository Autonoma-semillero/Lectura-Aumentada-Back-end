import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from '../domain/constants/users.tokens';
import { IUsersRepository } from '../domain/interfaces/users.repository.interface';
import { User } from '../domain/interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

/**
 * Capa application: casos de uso de users.
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.usersRepository.create({
      email: dto.email,
      display_name: dto.display_name,
      password_hash: dto.password_hash,
      roles: dto.roles ?? ['student'],
      status: dto.status ?? 'active',
      metadata: dto.metadata,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    return this.usersRepository.update(id, dto);
  }
}
