import Redis from 'ioredis';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,

  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});
