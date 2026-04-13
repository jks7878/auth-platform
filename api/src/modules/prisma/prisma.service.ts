import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.MARIADB_HOST ?? 'localhost',
      port: Number(process.env.MARIADB_PORT ?? 3306),
      user: process.env.MARIADB_USER ?? 'root',
      password: process.env.MARIADB_PASSWORD ?? '',
      database: process.env.MARIADB_NAME ?? 'auth_platform',
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
