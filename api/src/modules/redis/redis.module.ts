import { Module } from '@nestjs/common';
import { redisProvider } from './redis.provider';
import { RedisService } from './redis.service';
import { RedisRefreshTokenStore } from '../auth/infrastructure/redis/redis-refresh-token.store';
import { REDIS_CLIENT } from './redis.constants';

@Module({
    providers: [
        redisProvider, 
        RedisService
    ],
    exports: [
        RedisService,
        REDIS_CLIENT
    ]
})
export class RedisModule {}
