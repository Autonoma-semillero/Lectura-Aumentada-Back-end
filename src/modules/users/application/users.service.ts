import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from '../domain/constants/users.tokens';
import { IUsersRepository } from '../domain/interfaces/users.repository.interface';
import { User } from '../domain/interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { PublicUserResponseDto } from '../dto/public-user-response.dto';
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

  async listPublicUsers(): Promise<PublicUserResponseDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.toPublicUserResponse(user));
  }

  async getPublicUserById(id: string): Promise<PublicUserResponseDto | null> {
    const user = await this.usersRepository.findById(id);
    return user ? this.toPublicUserResponse(user) : null;
  }

  async createPublic(dto: CreateUserDto): Promise<PublicUserResponseDto> {
    const user = await this.usersRepository.create({
      email: dto.email,
      display_name: dto.display_name,
      password_hash: dto.password_hash,
      roles: dto.roles ?? ['student'],
      status: dto.status ?? 'active',
      metadata: dto.metadata,
    });
    return this.toPublicUserResponse(user);
  }

  async updatePublic(
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUserResponseDto | null> {
    const user = await this.usersRepository.update(id, dto);
    return user ? this.toPublicUserResponse(user) : null;
  }

  private toPublicUserResponse(user: User): PublicUserResponseDto {
    const { password_hash: _passwordHash, ...rest } = user;
    void _passwordHash;
    return {
      id: rest.id,
      email: rest.email,
      display_name: rest.display_name,
      roles: rest.roles,
      status: rest.status,
      metadata: rest.metadata,
      created_at: rest.created_at,
      updated_at: rest.updated_at,
    };
  }
}
