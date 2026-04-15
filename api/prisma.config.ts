import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const mariadbHost = process.env.MARIADB_HOST;
const mariadbPort = process.env.MARIADB_PORT;
const mariadbUser = process.env.MARIADB_USER;
const mariadbPassword = process.env.MARIADB_PASSWORD;
const mariadbDatabase = process.env.MARIADB_DATABASE;

if (
  !mariadbHost ||
  !mariadbPort ||
  !mariadbUser ||
  !mariadbPassword ||
  !mariadbDatabase
) {
  throw new Error("Prisma DB environment variables are not fully defined.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `mysql://${mariadbUser}:${mariadbPassword}@${mariadbHost}:${mariadbPort}/${mariadbDatabase}`,
  },
});
