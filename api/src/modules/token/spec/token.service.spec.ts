import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../token.service';

describe('TokenService', () => {
  let module: TestingModule;
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_ACCESS_EXPIRES_IN: '5s',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };

              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TokenService);
    jwtService = module.get(JwtService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

    it('should create access token with access secret and expiresIn', async () => {
        jwtService.signAsync.mockResolvedValue('signed-access-token');

        const result = await service.createAccessToken(1, 'tester');

        expect(result).toBe('signed-access-token');
        expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, username: 'tester' },
        {
            secret: 'access-secret',
            expiresIn: '5s',
        },
        );
    });

    it('should create refresh token with refresh secret and expiresIn', async () => {
        jwtService.signAsync.mockResolvedValue('signed-refresh-token');

        const result = await service.createRefreshToken(1, 'tester');

        expect(result).toBe('signed-refresh-token');
        expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, username: 'tester' },
        {
            secret: 'refresh-secret',
            expiresIn: '7d',
        },
        );
    });

    it('should create auth tokens', async () => {
        jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');

        const result = await service.createAuthTokens(1, 'tester');

        expect(result).toEqual({
            accessToken: 'signed-access-token',
            refreshToken: 'signed-refresh-token',
        });
    });

    it('should verify refresh token with refresh secret', async () => {
        jwtService.verifyAsync.mockResolvedValue({
            sub: 1,
            username: 'tester',
        } as never);

        const result = await service.verifyRefreshToken('refresh-token');

        expect(result).toEqual({
            sub: 1,
            username: 'tester',
        });

        expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
            secret: 'refresh-secret',
        });
    });
});
