import { Test, TestingModule } from '@nestjs/testing';
import ms from 'ms';

import { RedisRefreshTokenStore } from '../infrastructure/redis/redis-refresh-token.store';
import { RedisService } from '@/modules/redis/redis.service';
import { ConfigService } from '@nestjs/config';

import { createSha256Hash } from '@/common/util';

describe('RedisRefreshTokenStore', () => {
    let module: TestingModule;
    let refreshTokenStore: RedisRefreshTokenStore;
    let redisService: jest.Mocked<RedisService>;

    const graceTTL = 60;

    beforeEach(async () => {
        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        module = await Test.createTestingModule({
        providers: [
            RedisRefreshTokenStore,
            {
                provide: RedisService,
                useValue: {
                    get: jest.fn(),
                    set: jest.fn(),
                    del: jest.fn(),
                    eval: jest.fn(),
                    hset: jest.fn(),
                    expire: jest.fn()
                },
            },
            {
                provide: ConfigService,
                useValue: {
                    get: jest.fn((key: string) => {
                    if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
                    if (key === 'JWT_REFRESH_ABSOLUTE_EXPIRES_IN') return '30d';
                    return undefined;
                    }),
                },
            },
        ],
        }).compile();

        refreshTokenStore = module.get(RedisRefreshTokenStore);
        redisService = module.get(RedisService);
    });
    afterEach(async () => {
        jest.restoreAllMocks();
        await module.close();
    });

    const refreshTtl = Math.floor(ms('7d') / 1000);
    const absoluteTtl = Math.floor(ms('30d') / 1000);
    const now = Math.floor(1700000000000 / 1000);

    it.each([
    'OK',
    'REUSED',
    'INVALID',
    'ABSOLUTE_EXPIRED',
    ] as const)('should return %s', async (status) => {
        redisService.eval.mockResolvedValueOnce([status]);

        const result = await refreshTokenStore.rotateRefreshToken({
            userId: 1,
            oldRefreshToken: 'old-refresh-token',
            newRefreshToken: 'new-refresh-token',
        });

        expect(result).toBe(status);
        expect(redisService.eval).toHaveBeenCalledWith(
            expect.any(String),
            3,
            `refresh:current:1`,
            `refresh:previous:1`,
            `refresh:session:1`,
            createSha256Hash('old-refresh-token'),
            createSha256Hash('new-refresh-token'),
            String(refreshTtl),
            expect.any(String),
            String(graceTTL)
        );
    });

  it('should initialize session by revoking old slots and storing current token', async () => {
    const expectedAbsoluteExpiresAt = now + absoluteTtl;

    const userId = 1;
    const refreshToken = 'refresh-token';

    redisService.del.mockResolvedValue(1);

    redisService.set.mockResolvedValue();
    redisService.hset.mockResolvedValue(1);
    redisService.expire.mockResolvedValue();

    await refreshTokenStore.initializeSession({
        userId: userId, 
        refreshToken: refreshToken
    });

    expect(redisService.del).toHaveBeenCalledTimes(3);

    expect(redisService.set).toHaveBeenCalledTimes(1);
    expect(redisService.set).toHaveBeenCalledWith(
        `refresh:current:${userId}`,
        createSha256Hash(refreshToken),
        Math.min(refreshTtl, absoluteTtl)
    );

    expect(redisService.hset).toHaveBeenCalledWith(
        `refresh:session:${userId}`,
        {
            absoluteExpiresAt: String(expectedAbsoluteExpiresAt),
            updatedAt: String(now),
        }
    );

    expect(redisService.expire).toHaveBeenCalledWith(
        `refresh:session:${userId}`,
        absoluteTtl + graceTTL
    );
  });
});
