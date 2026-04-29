import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { RefreshService } from '../refresh.service';
import { TokenService } from '@/modules/token/token.service';
import { RedisRefreshTokenStore } from '../infrastructure/redis/redis-refresh-token.store';

describe('RefreshService', () => {
  let module: TestingModule;
  let refreshService: RefreshService;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenStore: jest.Mocked<RedisRefreshTokenStore>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RefreshService,
        {
          provide: TokenService,
          useValue: {
            createAuthTokens: jest.fn(),
          },
        },
        {
          provide: RedisRefreshTokenStore,
          useValue: {
            initializeSession: jest.fn(),
            rotateRefreshToken: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
      ],
    }).compile();

    refreshService = module.get(RefreshService);
    tokenService = module.get(TokenService);
    refreshTokenStore = module.get(RedisRefreshTokenStore);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  it('should initialize refresh session', async () => {
    await refreshService.initializeSession(1, 'refresh-token');

    expect(refreshTokenStore.initializeSession).toHaveBeenCalledWith({
      userId: 1,
      refreshToken: 'refresh-token',
    });
  });

  it('should return tokens when refresh rotation succeeds', async () => {
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'new-refresh-token',
    };

    tokenService.createAuthTokens.mockResolvedValueOnce(tokens);
    refreshTokenStore.rotateRefreshToken.mockResolvedValueOnce('OK');

    const result = await refreshService.refresh(
      1,
      'test-user',
      'old-refresh-token',
    );

    expect(result).toBe(tokens);
    expect(tokenService.createAuthTokens).toHaveBeenCalledWith(1, 'test-user');
    expect(refreshTokenStore.rotateRefreshToken).toHaveBeenCalledWith({
      userId: 1,
      oldRefreshToken: 'old-refresh-token',
      newRefreshToken: 'new-refresh-token',
    });
  });

  it('should throw REFRESH_TOKEN_REUSE when refresh token is reused', async () => {
    tokenService.createAuthTokens.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'new-refresh-token',
    });

    refreshTokenStore.rotateRefreshToken.mockResolvedValueOnce('REUSED');

    await expect(
      refreshService.refresh(1, 'test-user', 'old-refresh-token'),
    ).rejects.toMatchObject({
      response: {
        message: 'Refresh token reuse detected',
        code: 'REFRESH_TOKEN_REUSE',
      },
    });
  });

  it('should throw REFRESH_SESSION_EXPIRED when refresh session is expired', async () => {
    tokenService.createAuthTokens.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'new-refresh-token',
    });

    refreshTokenStore.rotateRefreshToken.mockResolvedValueOnce(
      'ABSOLUTE_EXPIRED',
    );

    await expect(
      refreshService.refresh(1, 'test-user', 'old-refresh-token'),
    ).rejects.toMatchObject({
      response: {
        message: 'Refresh session expired',
        code: 'REFRESH_SESSION_EXPIRED',
      },
    });
  });

  it('should throw INVALID_REFRESH_TOKEN when refresh token is invalid', async () => {
    tokenService.createAuthTokens.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'new-refresh-token',
    });

    refreshTokenStore.rotateRefreshToken.mockResolvedValueOnce('INVALID');

    await expect(
      refreshService.refresh(1, 'test-user', 'old-refresh-token'),
    ).rejects.toMatchObject({
      response: {
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      },
    });
  });

  it('should revoke refresh session', async () => {
    await refreshService.revokeRefreshSession(1);

    expect(refreshTokenStore.revokeSession).toHaveBeenCalledWith(1);
  });
});
