import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Guard placeholder para proteger endpoints con JWT.
 * La validación real se implementará en la fase de auth.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
