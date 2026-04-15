import { Module } from '@nestjs/common';
import Joi from 'joi';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
        MARIADB_HOST: Joi.string().required(),
        MARIADB_PORT: Joi.number().required(),
        MARIADB_DATABASE: Joi.string().required(),
        MARIADB_USER: Joi.string().required(),
        MARIADB_PASSWORD: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
      }),
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
})
export class AppModule {}
