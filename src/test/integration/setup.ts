import "dotenv/config";
import { afterEach, beforeAll } from "vitest";
import { requireTestDatabaseUrl } from "@/src/config/test-database-url";

// Read before anything imports the Prisma client, so the client is built
// against the test database and the guard has already refused a wrong one.
const testDatabaseUrl = requireTestDatabaseUrl(process.env);
// @types/node declares NODE_ENV read-only, so it cannot be assigned directly.
// Vitest has already set it to "test"; this states the requirement the Prisma
// client below depends on rather than assuming it.
Object.assign(process.env, { NODE_ENV: "test" });
process.env.DATABASE_URL = testDatabaseUrl;

const { prisma } = await import("@/src/infrastructure/db/client");

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((row) => `"public"."${row.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
});
