import { IAuthRepository } from '../domain/interfaces/auth.repository.interface';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
export declare class AuthService {
    private readonly authRepository;
    constructor(authRepository: IAuthRepository);
    login(dto: LoginDto): Promise<unknown>;
    refresh(dto: RefreshTokenDto): Promise<unknown>;
    logout(token: string): Promise<void>;
}
