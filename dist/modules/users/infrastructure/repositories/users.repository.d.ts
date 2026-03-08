import { Connection } from 'mongoose';
import { User } from '../../domain/interfaces/user.interface';
import { IUsersRepository } from '../../domain/interfaces/users.repository.interface';
export declare class UsersRepository implements IUsersRepository {
    private readonly connection;
    constructor(connection: Connection);
    findAll(): Promise<User[]>;
    findById(_id: string): Promise<User | null>;
    create(payload: Partial<User>): Promise<User>;
    update(_id: string, payload: Partial<User>): Promise<User | null>;
}
