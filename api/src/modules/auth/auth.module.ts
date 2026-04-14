import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

/** Modules */
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { TokenModule } from '@/modules/token/token.module';
/** Services */
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
/** Strategies */
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    PassportModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy
  ],
})
export class AuthModule {}
