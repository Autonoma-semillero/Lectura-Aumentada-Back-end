import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<unknown>;
    findById(id: string): Promise<unknown>;
    create(dto: CreateUserDto): Promise<unknown>;
    update(id: string, dto: UpdateUserDto): Promise<unknown>;
}
