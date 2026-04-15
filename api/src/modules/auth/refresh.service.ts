import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import ms from 'ms';
import type { StringValue } from 'ms';

/** Services */
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/modules/redis/redis.service';
import { TokenService } from '@/modules/token/token.service';

type RefreshSlot = 'current' | 'previous';

@Injectable()
export class RefreshService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshKey(userId: number, slot: 'current' | 'previous') {
    return `refresh:${slot}:${userId}`;
  }

  private getRefreshTtlSeconds() {
    return Math.floor(
      ms(this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN')!) / 1000,
    );
  }

  private async saveSlot(
    userId: number,
    refreshToken: string,
    slot: RefreshSlot,
  ) {
    await this.redisService.set(
      this.getRefreshKey(userId, slot),
      this.hashToken(refreshToken),
      this.getRefreshTtlSeconds(),
    );
  }

  private async matchesSlot(
    userId: number,
    refreshToken: string,
    slot: RefreshSlot,
  ) {
    const stored = await this.redisService.get(this.getRefreshKey(userId, slot));
    if (!stored) return false;

    return stored === this.hashToken(refreshToken);
  }

  private storeCurrent(userId: number, refreshToken: string) {
    return this.saveSlot(userId, refreshToken, 'current');
  }

  private storePrevious(userId: number, refreshToken: string) {
    return this.saveSlot(userId, refreshToken, 'previous');
  }

  private matchesCurrent(userId: number, refreshToken: string) {
    return this.matchesSlot(userId, refreshToken, 'current');
  }

  private matchesPrevious(userId: number, refreshToken: string) {
    return this.matchesSlot(userId, refreshToken, 'previous');
  }

  async initializeSession(userId: number, refreshToken: string) {
    await this.revokeRefreshSession(userId);
    await this.storeCurrent(userId, refreshToken);
  }

  async refresh(userId: number, username: string, refreshToken: string) {
    const isCurrent = await this.matchesCurrent(userId, refreshToken);

    if (isCurrent) {
      const tokens = await this.tokenService.createAuthTokens(userId, username);

      await this.storePrevious(userId, refreshToken);
      await this.storeCurrent(userId, tokens.refreshToken);

      return tokens;
    }

    const isReused = await this.matchesPrevious(userId, refreshToken);

    if (isReused) {
      await this.revokeRefreshSession(userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async revokeRefreshSession(userId: number) {
    await this.redisService.del(this.getRefreshKey(userId, 'current'));
    await this.redisService.del(this.getRefreshKey(userId, 'previous'));
  }
}
