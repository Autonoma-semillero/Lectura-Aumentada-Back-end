import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { User } from '../../domain/interfaces/user.interface';
import { IUsersRepository } from '../../domain/interfaces/users.repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  async findAll(): Promise<User[]> {
    void this.connection;
    return [];
  }

  async findById(_id: string): Promise<User | null> {
    void this.connection;
    return null;
  }

  async create(payload: Partial<User>): Promise<User> {
    void this.connection;
    return payload as User;
  }

  async update(_id: string, payload: Partial<User>): Promise<User | null> {
    void this.connection;
    return payload as User;
  }
}
