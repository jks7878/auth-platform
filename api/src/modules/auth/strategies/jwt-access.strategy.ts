import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Services */
import { ConfigService } from '@nestjs/config';

type AccessTokenPayload = {
  sub: number;
  username: string;
};

function extractAccessTokenFromCookie(req: Request): string | null {
  return req?.cookies?.accessToken ?? null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    configService: ConfigService
  ) {
    const accessSecret = configService.get<string>('JWT_ACCESS_SECRET')!;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractAccessTokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
    };
  }
}
