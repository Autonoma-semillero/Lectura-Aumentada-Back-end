import { IUsersRepository } from '../domain/interfaces/users.repository.interface';
import { User } from '../domain/interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: IUsersRepository);
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    create(dto: CreateUserDto): Promise<User>;
    update(id: string, dto: UpdateUserDto): Promise<User | null>;
}
