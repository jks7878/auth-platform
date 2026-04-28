import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

/** Modules */
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { TokenModule } from '@/modules/token/token.module';
/** Controllers */
import { AuthController } from './auth.controller';
/** Services */
import { AuthService } from './auth.service';
import { RefreshService } from './refresh.service';
/** Strategies */
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

import { RedisRefreshTokenStore } from './infrastructure/redis/redis-refresh-token.store';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    RedisModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    RedisRefreshTokenStore,
  ],
})
export class AuthModule {}
