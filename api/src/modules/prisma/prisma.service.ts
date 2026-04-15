import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/** Services */
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService
  ) {
    const adapter = new PrismaMariaDb({
      host: configService.get<string>('MARIADB_HOST')!,
      port: configService.get<number>('MARIADB_PORT')!,
      user: configService.get<string>('MARIADB_USER')!,
      password: configService.get<string>('MARIADB_PASSWORD')!,
      database: configService.get<string>('MARIADB_DATABASE'),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
