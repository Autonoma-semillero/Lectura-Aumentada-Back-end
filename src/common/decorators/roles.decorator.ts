import { SetMetadata } from '@nestjs/common';
import type { AuthRequestUser } from '../../modules/auth/dto/auth-request-user.dto';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AuthRequestUser['role'][]) => SetMetadata(ROLES_KEY, roles);
