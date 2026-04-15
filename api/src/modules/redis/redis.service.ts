import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { redisClient } from './redis.client';

@Injectable()
export class RedisService implements OnModuleDestroy {

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {

    if (ttlSeconds) {
      await redisClient.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await redisClient.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return redisClient.get(key);
  }

  async del(key: string): Promise<number> {
    return redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await redisClient.expire(key, ttlSeconds);
  }

  async onModuleDestroy() {
    await redisClient.quit();
  }
}
