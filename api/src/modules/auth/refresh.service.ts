import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';

/** Services */
import { RedisService } from '@/modules/redis/redis.service';
import { TokenService } from '@/modules/token/token.service';


@Injectable()
export class RefreshService {
  constructor(
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
  ) {}

  private getRefreshKey(userId: number) {
    return `refresh:${userId}`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async saveRefreshToken(
    userId: number,
    refreshToken: string,
  ) {

    const key = `refresh:${userId}`;

    await this.redisService.set(
      key,
      this.hashToken(refreshToken),
      60 * 60 * 24 * 7,
    );
  }
  
  async validateRefreshToken(userId: number, refreshToken: string) {
    const key = this.getRefreshKey(userId);
    
    const storedHashedToken = await this.redisService.get(key);
    
    if (!storedHashedToken) {
        return false;
    }

    const currentHashedToken = this.hashToken(refreshToken);

    return storedHashedToken === currentHashedToken;
  }

  async refreshAuthTokens(id: number, username: string, refreshToken: string) {
    const isValid = await this.validateRefreshToken(id, refreshToken);
    
    if (!isValid) {
        throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    const tokens = await this.tokenService.refreshAuthTokens(id, username);

    await this.saveRefreshToken(id, tokens.refreshToken);

    return tokens;
  }
}
