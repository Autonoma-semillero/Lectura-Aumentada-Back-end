import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * A classroom commonly shares one public IP. Rate-limit authenticated traffic by
 * account instead, while retaining the IP fallback for public endpoints.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    if (user?.userId) return `user:${user.userId}`;
    const socket = req.socket as { remoteAddress?: string } | undefined;
    return `ip:${String(req.ip ?? socket?.remoteAddress ?? 'unknown')}`;
  }
}
