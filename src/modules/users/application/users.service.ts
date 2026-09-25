import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { hashPassword } from '../../auth/domain/password.util';
import { createStudentPinLookup } from '../../auth/domain/student-pin.util';
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

  async findStudentsByIds(ids: string[]): Promise<User[]> {
    const students = await this.usersRepository.findStudentsByIds([
      ...new Set(ids),
    ]);
    return students.map((student) => this.withoutPasswordHash(student));
  }

  async searchStudents(query = '', limit = 30, offset = 0): Promise<User[]> {
    const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
    const normalizedOffset = Math.max(0, Math.trunc(offset));
    const students = await this.usersRepository.searchStudents(
      query.trim(),
      normalizedLimit,
      normalizedOffset,
    );
    return students.map((student) => this.withoutPasswordHash(student));
  }

  async createPublic(dto: CreateUserDto): Promise<PublicUserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    await this.ensureUniqueIdentifiers(email, username);

    const user = await this.usersRepository.create({
      email,
      username,
      display_name: dto.display_name,
      password_hash: await hashPassword(dto.password),
      student_pin_hash: dto.student_pin ? await hashPassword(dto.student_pin) : undefined,
      student_pin_lookup: dto.student_pin ? createStudentPinLookup(dto.student_pin) : undefined,
      roles: dto.roles ?? ['student'],
      status: dto.status ?? 'active',
      metadata: dto.metadata ?? {},
    });
    return this.toPublicUserResponse(user);
  }

  async updatePublic(
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUserResponseDto | null> {
    const payload = await this.toUpdatePayload(id, dto);
    const user = await this.usersRepository.update(id, payload);
    return user ? this.toPublicUserResponse(user) : null;
  }

  private async toUpdatePayload(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Partial<User>> {
    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    await this.ensureUniqueIdentifiers(email, username, id);

    return {
      email,
      username,
      display_name: dto.display_name,
      password_hash:
        dto.password === undefined
          ? undefined
          : await hashPassword(dto.password),
      student_pin_hash:
        dto.student_pin === undefined ? undefined : await hashPassword(dto.student_pin),
      student_pin_lookup:
        dto.student_pin === undefined ? undefined : createStudentPinLookup(dto.student_pin),
      roles: dto.roles,
      status: dto.status,
      metadata: dto.metadata,
    };
  }

  private async ensureUniqueIdentifiers(
    email?: string,
    username?: string,
    currentUserId?: string,
  ): Promise<void> {
    const [emailOwner, usernameOwner] = await Promise.all([
      email ? this.usersRepository.findByEmail(email) : Promise.resolve(null),
      username
        ? this.usersRepository.findByUsername(username)
        : Promise.resolve(null),
    ]);
    if (emailOwner && emailOwner.id !== currentUserId) {
      throw new ConflictException('Email is already registered');
    }
    if (usernameOwner && usernameOwner.id !== currentUserId) {
      throw new ConflictException('Username is already registered');
    }
  }

  private toPublicUserResponse(user: User): PublicUserResponseDto {
    const { password_hash: _passwordHash, student_pin_hash: _studentPinHash, student_pin_lookup: _studentPinLookup, ...rest } = user;
    void _passwordHash;
    void _studentPinHash;
    void _studentPinLookup;
    return {
      id: rest.id,
      email: rest.email,
      username: rest.username,
      display_name: rest.display_name,
      roles: rest.roles,
      status: rest.status,
      metadata: rest.metadata,
      created_at: rest.created_at,
      updated_at: rest.updated_at,
    };
  }

  private withoutPasswordHash(user: User): User {
    const { password_hash: _passwordHash, student_pin_hash: _studentPinHash, student_pin_lookup: _studentPinLookup, ...student } = user;
    void _passwordHash;
    void _studentPinHash;
    void _studentPinLookup;
    return student;
  }
}
