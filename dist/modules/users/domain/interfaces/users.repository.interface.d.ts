import { User } from './user.interface';
export interface IUsersRepository {
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    create(payload: Partial<User>): Promise<User>;
    update(id: string, payload: Partial<User>): Promise<User | null>;
}
