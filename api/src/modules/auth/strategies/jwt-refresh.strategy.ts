import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Services */
import { ConfigService } from '@nestjs/config';

type RefreshTokenPayload = {
  sub: number;
  username: string;
};

function extractRefreshTokenFromCookie(req: Request): string | null {
  return req?.cookies?.refreshToken ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService
  ) {
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET')!;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractRefreshTokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
    });
  }

  async validate(payload: RefreshTokenPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
    };
  }
}
