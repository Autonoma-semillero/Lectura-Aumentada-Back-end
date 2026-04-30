import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../application/auth.service';
import type { AuthRequestUser } from '../dto/auth-request-user.dto';
import {
  AuthTokensResponseDto,
  LoginResponseDto,
} from '../dto/login-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

/**
 * Capa presentation: solo expone endpoints HTTP y delega al service.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    await this.authService.logout(req.user.jti);
  }
}
