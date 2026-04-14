import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = {
  sub: number;
  username: string;
};

@Injectable()
export class TokenService {
    constructor(
      private readonly jwtService: JwtService
    ) {}

  async createAccessToken(id: number, username: string) {
    const payload: JwtPayload = { sub: id, username };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
  }

  async createRefreshToken(id: number, username: string) {
    const payload: JwtPayload = { sub: id, username };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
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

  async refreshAuthTokens(id: number, username: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(id, username),
      this.createRefreshToken(id, username),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
