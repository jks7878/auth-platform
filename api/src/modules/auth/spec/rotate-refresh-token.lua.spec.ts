import Redis from 'ioredis';
import { ROTATE_REFRESH_TOKEN_LUA } from '../infrastructure/redis/rotate-refresh-token.lua';

describe('ROTATE_REFRESH_TOKEN_LUA', () => {
  let redis: Redis;

  const userId = 9999;

  const currentKey = `test:refresh:current:${userId}`;
  const previousKey = `test:refresh:previous:${userId}`;
  const sessionKey = `test:refresh:session:${userId}`;

  const oldToken = 'old-refresh-token-hash';
  const newToken = 'new-refresh-token-hash';

  const refreshTtl = 60;

  const evalRotate = async (params?: {
    oldToken?: string;
    newToken?: string;
    now?: number;
  }) => {
    const now = params?.now ?? Math.floor(Date.now() / 1000);
    const graceTTL = 60;

    const result = await redis.eval(
      ROTATE_REFRESH_TOKEN_LUA,
      3,
      currentKey,
      previousKey,
      sessionKey,
      params?.oldToken ?? oldToken,
      params?.newToken ?? newToken,
      String(refreshTtl),
      String(now),
      graceTTL
    );

    return result as [string, string?];
  };

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.del(currentKey, previousKey, sessionKey);
  });
  
  it('current token이 일치하면 OK를 반환하고 current -> previous 상태 전이를 수행한다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now + 3600;

    await redis.set(currentKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });
    await redis.expire(sessionKey, 3600);

    const [status, finalTtl] = await evalRotate({ now });

    expect(status).toBe('OK');
    expect(Number(finalTtl)).toBe(refreshTtl);

    await expect(redis.get(previousKey)).resolves.toBe(oldToken);
    await expect(redis.get(currentKey)).resolves.toBe(newToken);

    await expect(redis.hget(sessionKey, 'updatedAt')).resolves.toBe(
      String(now),
    );
  });

  it('previous token이 재사용되면 REUSED를 반환하고 세션을 revoke 한다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now + 3600;

    await redis.set(currentKey, newToken, 'EX', refreshTtl);
    await redis.set(previousKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });
    await redis.expire(sessionKey, 3600);

    const [status] = await evalRotate({
      oldToken,
      newToken: 'another-new-token-hash',
      now,
    });

    expect(status).toBe('REUSED');

    await expect(redis.exists(currentKey)).resolves.toBe(0);
    await expect(redis.exists(previousKey)).resolves.toBe(0);
    await expect(redis.exists(sessionKey)).resolves.toBe(0);
  });

  it('absoluteExpiresAt이 없으면 INVALID를 반환한다', async () => {
    await redis.set(currentKey, oldToken, 'EX', refreshTtl);

    const [status] = await evalRotate();

    expect(status).toBe('INVALID');
  });

  it('absolute lifetime이 만료되면 ABSOLUTE_EXPIRED를 반환하고 세션을 제거한다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now - 1;

    await redis.set(currentKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now - 10),
    });

    const [status] = await evalRotate({ now });

    expect(status).toBe('ABSOLUTE_EXPIRED');

    await expect(redis.exists(currentKey)).resolves.toBe(0);
    await expect(redis.exists(previousKey)).resolves.toBe(0);
    await expect(redis.exists(sessionKey)).resolves.toBe(0);
  });

  it('remaining absolute TTL이 refresh TTL보다 짧으면 final TTL을 absolute TTL에 맞춘다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now + 10;

    await redis.set(currentKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });
    await redis.expire(sessionKey, 10);

    const [status, finalTtl] = await evalRotate({ now });

    expect(status).toBe('OK');
    expect(Number(finalTtl)).toBe(10);

    const currentTtl = await redis.ttl(currentKey);
    const previousTtl = await redis.ttl(previousKey);
    const sessionTtl = await redis.ttl(sessionKey);

    expect(currentTtl).toBeLessThanOrEqual(10);
    expect(previousTtl).toBeLessThanOrEqual(10);
    expect(sessionTtl).toBeLessThanOrEqual(70);
  });

  it('current / previous 어느 쪽에도 일치하지 않으면 INVALID를 반환한다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now + 3600;

    await redis.set(currentKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });
    await redis.expire(sessionKey, 3600);

    const [status] = await evalRotate({
      oldToken: 'invalid-token-hash',
      now,
    });

    expect(status).toBe('INVALID');

    await expect(redis.get(currentKey)).resolves.toBe(oldToken);
    await expect(redis.exists(previousKey)).resolves.toBe(0);
  });

  it('동시에 같은 current token으로 rotate 요청이 들어오면 하나만 OK, 나머지는 REUSED가 된다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const absoluteExpiresAt = now + 3600;

    await redis.set(currentKey, oldToken, 'EX', refreshTtl);
    await redis.hset(sessionKey, {
      absoluteExpiresAt: String(absoluteExpiresAt),
      updatedAt: String(now),
    });
    await redis.expire(sessionKey, 3600);

    const results = await Promise.all([
      evalRotate({ oldToken, newToken: 'new-token-1', now }),
      evalRotate({ oldToken, newToken: 'new-token-2', now }),
    ]);

    const statuses = results.map(([status]) => status).sort();

    expect(statuses).toEqual(['OK', 'REUSED'].sort());

    await expect(redis.exists(currentKey)).resolves.toBe(0);
    await expect(redis.exists(previousKey)).resolves.toBe(0);
    await expect(redis.exists(sessionKey)).resolves.toBe(0);
  });
});
