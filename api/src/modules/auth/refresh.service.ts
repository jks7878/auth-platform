import { Injectable, UnauthorizedException } from '@nestjs/common';

/** Services */
import { TokenService } from '@/modules/token/token.service';
/** infrastructure */
import { RedisRefreshTokenStore } from './infrastructure/redis/redis-refresh-token.store';

@Injectable()
export class RefreshService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly refreshTokenStore: RedisRefreshTokenStore
  ) {}

  async initializeSession(userId: number, refreshToken: string) {
    await this.refreshTokenStore.initializeSession({
      userId,
      refreshToken,
    });
  }

  async refresh(userId: number, username: string, refreshToken: string) {
    const tokens = await this.tokenService.createAuthTokens(userId, username);
    
    const rotateResult = await this.refreshTokenStore.rotateRefreshToken({
      userId,
      oldRefreshToken: refreshToken,
      newRefreshToken: tokens.refreshToken,
    });
    
    if (rotateResult === 'OK') {
      return tokens;
    }

    if (rotateResult === 'REUSED') {
      throw new UnauthorizedException({
        message: 'Refresh token reuse detected',
        code: 'REFRESH_TOKEN_REUSE',
      });
    }

    if (rotateResult === 'ABSOLUTE_EXPIRED') {
      throw new UnauthorizedException({
        message: 'Refresh session expired',
        code: 'REFRESH_SESSION_EXPIRED',
      });
    }

    throw new UnauthorizedException({
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  async revokeRefreshSession(userId: number) {
    await this.refreshTokenStore.revokeSession(userId);
  }
}
