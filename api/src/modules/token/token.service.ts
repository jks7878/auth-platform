import { Injectable } from '@nestjs/common';
import type { StringValue } from 'ms';

/** Services */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = {
  sub: number;
  username: string;
};

@Injectable()
export class TokenService {
    constructor(
      private readonly configService: ConfigService,
      private readonly jwtService: JwtService
    ) {}

  async createAccessToken(id: number, username: string) {
    const payload: JwtPayload = { sub: id, username };
    
    const accessSecert = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const accessExpiresIn = this.configService.get<StringValue>('JWT_ACCESS_EXPIRES_IN')!;

    return this.jwtService.signAsync(payload, {
      secret: accessSecert,
      expiresIn: accessExpiresIn,
    });
  }

  async createRefreshToken(id: number, username: string) {
    const payload: JwtPayload = { sub: id, username };

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const refreshExpiresIn = this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN')!;

    return this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });
  }

  async createAuthTokens(id: number, username: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(id, username),
      this.createRefreshToken(id, username),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
    });
  }
}
