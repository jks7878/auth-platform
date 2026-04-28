import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {

    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.redisClient.set(key, value);
  }

  async hset(key: string, values: Record<string, string | number>) {
    return this.redisClient.hset(key, values);
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async hget(key: string, field: string) {
    return this.redisClient.hget(key, field);
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async eval(
    script: string,
    numberOfKeys: number,
    ...args: Array<string | number>
  ) {
    return this.redisClient.eval(script, numberOfKeys, ...args);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redisClient.expire(key, ttlSeconds);
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
