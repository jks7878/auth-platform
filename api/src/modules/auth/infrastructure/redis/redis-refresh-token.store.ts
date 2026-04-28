import { Injectable } from '@nestjs/common';
import ms from 'ms';
import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '@/modules/redis/redis.service';
import { ROTATE_REFRESH_TOKEN_LUA } from './rotate-refresh-token.lua';

import { createSha256Hash } from '@/common/util';


export type RotateRefreshTokenResult = 'OK' | 'REUSED' | 'INVALID';

@Injectable()
export class RedisRefreshTokenStore {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  private currentKey(userId: number) {
    return `refresh:current:${userId}`;
  }

  private previousKey(userId: number) {
    return `refresh:previous:${userId}`;
  }

  private sessionKey(userId: number) {
    return `refresh:session:${userId}`;
  }

  private getRefreshTtlSeconds() {
    return Math.floor(
      ms(this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN')!) / 1000,
    );
  }

  private getAbsoluteTtlSeconds() {
    return Math.floor(
      ms(this.configService.get<StringValue>('JWT_REFRESH_ABSOLUTE_EXPIRES_IN')!) / 1000,
    );
  }

  async initializeSession(params: {
    userId: number;
    refreshToken: string;
  }) {
    const now = Math.floor(Date.now() / 1000);
    const refreshTtl = this.getRefreshTtlSeconds();
    const absoluteExpiresAt = now + this.getAbsoluteTtlSeconds();

    await this.redisService.del(this.currentKey(params.userId));
    await this.redisService.del(this.previousKey(params.userId));
    await this.redisService.del(this.sessionKey(params.userId));

    await this.redisService.set(
      this.currentKey(params.userId),
      createSha256Hash(params.refreshToken),
      Math.min(refreshTtl, this.getAbsoluteTtlSeconds()),
    );

    await this.redisService.hset(this.sessionKey(params.userId), {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });

    await this.redisService.expire(
      this.sessionKey(params.userId),
      this.getAbsoluteTtlSeconds(),
    );
  }

  async rotateRefreshToken(params: {
    userId: number;
    oldRefreshToken: string;
    newRefreshToken: string;
  }): Promise<'OK' | 'REUSED' | 'INVALID' | 'ABSOLUTE_EXPIRED'> {
    const now = Math.floor(Date.now() / 1000);
    const refreshTtl = this.getRefreshTtlSeconds();

    const result = await this.redisService.eval(
      ROTATE_REFRESH_TOKEN_LUA,
      3,
      this.currentKey(params.userId),
      this.previousKey(params.userId),
      this.sessionKey(params.userId),
      createSha256Hash(params.oldRefreshToken),
      createSha256Hash(params.newRefreshToken),
      String(refreshTtl),
      String(now),
    );

    const [status] = result as [string];

    return status as 'OK' | 'REUSED' | 'INVALID' | 'ABSOLUTE_EXPIRED';
  }

  async revokeSession(userId: number) {
    await this.redisService.del(this.currentKey(userId));
    await this.redisService.del(this.previousKey(userId));
    await this.redisService.del(this.sessionKey(userId));
  }
}
