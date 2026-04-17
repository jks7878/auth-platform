import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { RefreshService } from '../refresh.service';
import { RedisService } from '@/modules/redis/redis.service';
import { TokenService } from '@/modules/token/token.service';
import { ConfigService } from '@nestjs/config';

import { createSha256Hash } from '@/common/util';

describe('RefreshService', () => {
  let module: TestingModule;
  let service: RefreshService;
  let redisService: jest.Mocked<RedisService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RefreshService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            createAuthTokens: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(RefreshService);
    redisService = module.get(RedisService);
    tokenService = module.get(TokenService);
  });
  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  const userId = 1;
  const username = 'tester';

  it('should rotate refresh token when current token is used', async () => {
    const currentToken = 'current-token';
    const previousToken = 'previous-token';

    redisService.get
    .mockResolvedValueOnce(createSha256Hash(currentToken))    // current
    .mockResolvedValueOnce(createSha256Hash(previousToken))   // previous

    tokenService.createAuthTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const result = await service.refresh(userId, username, currentToken);

    expect(result.accessToken).toBe('new-access');
    expect(tokenService.createAuthTokens).toHaveBeenCalledWith(userId, username);

    expect(redisService.set).toHaveBeenCalledTimes(2);

    expect(redisService.set).toHaveBeenNthCalledWith(
      1,
      `refresh:previous:${userId}`,
      createSha256Hash(currentToken),
      7 * 24 * 60 * 60,
    );

    expect(redisService.set).toHaveBeenNthCalledWith(
      2,
      `refresh:current:${userId}`,
      createSha256Hash('new-refresh'),
      7 * 24 * 60 * 60,
    );
  });

  it('should detect reuse and revoke session', async () => {
    const currentToken = 'current-token';
    const previousToken = 'previous-token';

    redisService.get
    .mockResolvedValueOnce(createSha256Hash(currentToken))    // current
    .mockResolvedValueOnce(createSha256Hash(previousToken));  // previous

    await expect(
      service.refresh(userId, username, previousToken),
    ).rejects.toThrow('Refresh token reuse detected');

    expect(redisService.del).toHaveBeenCalledTimes(2);
    expect(redisService.del).toHaveBeenNthCalledWith(1, `refresh:current:${userId}`);
    expect(redisService.del).toHaveBeenNthCalledWith(2, `refresh:previous:${userId}`);
    expect(tokenService.createAuthTokens).not.toHaveBeenCalled();
  });

  it('should throw if refresh token is invalid', async () => {
    redisService.get
    .mockResolvedValueOnce(null)  // current
    .mockResolvedValueOnce(null); // previous

    await expect(
      service.refresh(userId, username, 'invalid-token'),
    ).rejects.toThrow('Invalid refresh token');
  });
  
  it('should revoke both refresh slots', async () => {
    await service.revokeRefreshSession(userId);

    expect(redisService.del).toHaveBeenCalledTimes(2);
    expect(redisService.del).toHaveBeenNthCalledWith(1, `refresh:current:${userId}`);
    expect(redisService.del).toHaveBeenNthCalledWith(2, `refresh:previous:${userId}`);
  });

  it('should initialize session by revoking old slots and storing current token', async () => {
    await service.initializeSession(userId, 'refresh-token');

    expect(redisService.del).toHaveBeenCalledTimes(2);
    expect(redisService.del).toHaveBeenNthCalledWith(1, `refresh:current:${userId}`);
    expect(redisService.del).toHaveBeenNthCalledWith(2, `refresh:previous:${userId}`);

    expect(redisService.set).toHaveBeenCalledTimes(1);
    expect(redisService.set).toHaveBeenCalledWith(
      `refresh:current:${userId}`,
      createSha256Hash('refresh-token'),
      7 * 24 * 60 * 60,
    );
  });
});
