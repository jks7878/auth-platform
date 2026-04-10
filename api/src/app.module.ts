import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      // 여러 env 파일 읽기
      envFilePath: [
        '.env',
        '../.env'
      ],
    }),
    AuthModule,
    PrismaModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
