import { AuthService } from '../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<unknown>;
    refresh(dto: RefreshTokenDto): Promise<unknown>;
    logout(token: string): Promise<void>;
}
